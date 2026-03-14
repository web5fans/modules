import { AtpAgent, FansWeb5CkbIndexAction} from "web5-api";
export { AtpAgent } from "web5-api";
import type { UnsignedCommit } from "@atproto/repo";
import { CID } from "multiformats";
import { TID } from '@atproto/common-web'
import * as cbor from "@ipld/dag-cbor";
import { KeystoreClient } from "keystore/KeystoreClient";

function bytesFrom(str: string | Uint8Array, encoding?: "utf8" | "hex"): Uint8Array {
  if (typeof str !== "string") {
    return str;
  }
  if (encoding === "hex") {
    if (str.startsWith("0x")) {
      str = str.slice(2);
    }
    const match = str.match(/.{1,2}/g);
    if (!match) {
      return new Uint8Array();
    }
    return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
  }
  return new TextEncoder().encode(str);
}

function hexFrom(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

export const name = 'PDS Module';

export function checkUsernameFormat(username: string): boolean {
  // username will be domain so it must follow the rules of domain name
  // it must start with a letter
  // it can only contain letters, numbers, and hyphens
  // it must end with a letter or number
  // it must be between 4 and 18 characters long
  if (username.length < 4 || username.length > 18) {
    return false;
  }
  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  return usernameRegex.test(username);
}

export async function getDidByUsername(username: string, pdsAPIUrl: string): Promise<string | null> {
  try {
    // username in pds is lowercase
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const url = `https://${handle}/.well-known/atproto-did`;
    const response = await fetch(url);
    const text = await response.text();
    
    if (text.trim().startsWith('did:ckb')) {
      return text.trim();
    } else if (text.includes('User not found')) {
      return '';
    } else {
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}


export type userInfo = {
    accessJwt: string;
    refreshJwt: string;
    handle: string;
    /** The DID of the new account. */
    did: string;
}

export async function pdsCreateAccount(agent: AtpAgent, pdsAPIUrl: string, username: string, didKey: string, did: string, ckbAddr: string, keyStoreClient: KeystoreClient): Promise<userInfo | null> {
  try {
    // username in handle is lowercase
    const handle = `${username.toLowerCase()}.${pdsAPIUrl}`;
    const res = await agent.fans.web5.ckb.preCreateAccount({
      handle,
      signingKey: didKey,
      did,
    })
    if (res.success) {
      const uncommit: UnsignedCommit = {
        did: res.data.did,
        version: 3,
        rev: res.data.rev,
        prev: null, // added for backwards compatibility with v2
        data: CID.parse(res.data.data),
      }

      const encoded = cbor.encode(uncommit)
      // remove 0x prefix
      const unSignBytesHex = hexFrom(encoded).slice(2);
      if (unSignBytesHex !== res.data.unSignBytes) {
        console.error('sign bytes not consistent', unSignBytesHex, res.data.unSignBytes);
        return null;
      }

      // sign the encoded data
      const sig = await keyStoreClient.signMessage(encoded);
      if (!sig) {
        console.error('sign failed');
        return null;
      }

      const params = {
        handle,
        password: "", // unused
        signingKey: didKey,
        ckbAddr,
        root: {
          did: res.data.did,
          version: 3,
          rev: res.data.rev,  
          prev: res.data.prev,
          data: res.data.data,
          signedBytes: hexFrom(sig),
        },
      }

      const createRes = await agent.web5CreateAccount(params)
      if (createRes.success) {
        // add didMetadata to userInfo
        const userInfo: userInfo = {
          accessJwt: createRes.data.accessJwt,
          refreshJwt: createRes.data.refreshJwt,
          handle: createRes.data.handle,
          did: createRes.data.did
        }
        return userInfo;
      } else {
        console.error('create account failed', createRes);
        return null;
      }
    } else {
      console.error('pre create account failed', res);
      return null;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}


export async function pdsDeleteAccount(agent: AtpAgent, did: string, ckbAddr: string, didKey: string, keyStoreClient: KeystoreClient): Promise<boolean | null> {
  try {
    // pre delete account
    const preDelectIndex = {
      $type: 'fans.web5.ckb.preIndexAction#deleteAccount' as const,
    }
  
    const preDelete = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preDelectIndex,
    })
    console.log('pre delete account params', preDelete);
    const deleteMessage = bytesFrom(preDelete.data.message, 'utf8');
  
    // sign the delete message
    const sig = await keyStoreClient.signMessage(deleteMessage);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    // delete account
    const deleteIndex = {
      $type: 'fans.web5.ckb.indexAction#deleteAccount' as const,
    }

    const deleteInfo = await agent.fans.web5.ckb.indexAction({
      did,
      message: preDelete.data.message,
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: deleteIndex,
    })
    if (deleteInfo.success) {
      return true;
    } else {
      console.error('delete account failed', deleteInfo);
      return false;
    }
  } catch (e: unknown) {
    console.error(e);
    return null;
  }
}


export type sessionInfo = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  didMetadata: string;
}

export async function pdsLogin(agent: AtpAgent, did: string, didKey: string, ckbAddr: string, keyStoreClient: KeystoreClient): Promise<sessionInfo | null> {
  const preLoginIndex = {
    $type: 'fans.web5.ckb.preIndexAction#createSession' as const,
  }

  const loginIndex = {
    $type: 'fans.web5.ckb.indexAction#createSession' as const,
  }

  try {
    const preLogin = await agent.fans.web5.ckb.preIndexAction({
      did,
      ckbAddr,
      index: preLoginIndex,
    })
    const preLoginMessage = bytesFrom(preLogin.data.message, 'utf8');

    const sig = await keyStoreClient.signMessage(preLoginMessage);
    if (!sig) {
      console.error('sign failed');
      return null;
    }

    const loginInfo = await agent.web5Login({
      did,
      message: preLogin.data.message,
      signingKey: didKey,
      signedBytes: hexFrom(sig),
      ckbAddr,
      index: loginIndex,
    })
    if (loginInfo.success) {
      const loginInfoData = loginInfo.data.result as FansWeb5CkbIndexAction.CreateSessionResult
      const sessionInfo: sessionInfo = {
        accessJwt: loginInfoData.accessJwt,
        refreshJwt: loginInfoData.refreshJwt,
        handle: loginInfoData.handle,
        did: loginInfoData.did,
        didMetadata: JSON.stringify(loginInfoData.didDoc),
      }
      return sessionInfo;
    } else {
      return null;
    }
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

/*
$ curl -s 'https://web5.bbsfans.dev/xrpc/com.atproto.repo.getRecord?repo=did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo&collection=app.actor.profile&rkey=self' | jq
{
  "uri": "at://did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo/app.actor.profile/self",
  "cid": "bafyreicvf7s2ixko72zz3fry4g2ihnbxphj5bmyfanbwewrlc3bzavmhae",
  "value": {
    "$type": "app.actor.profile",
    "created": "2026-01-30T09:35:56.535Z",
    "description": "哈哈哈",
    "displayName": "david wei",
    "handle": "david.web5.bbsfans.dev"
  }
}

$ curl -s 'https://web5.bbsfans.dev/xrpc/com.atproto.repo.getRecord?repo=did:ckb:52vmubyl4y3al5k246owb7nhkmwhwgx7&collection=app.actor.profile&rkey=self' | jq
{
  "uri": "at://did:ckb:52vmubyl4y3al5k246owb7nhkmwhwgx7/app.actor.profile/self",
  "cid": "bafyreicyywteraj2bb3c4u3sxfaa2r2vkkljkzhtga5fnw2ebni6ch5ba4",
  "value": {
    "$type": "app.actor.profile",
    "created": "2025-12-25T06:55:18Z",
    "displayName": "jler",
    "handle": "jler.web5.bbsfans.dev"
  }
}
*/

export type userProfile = {
  uri: string;
  cid: string;
  value: Record<string, any>;
}

export async function fetchUserProfile(did: string, pdsAPIUrl: string): Promise<userProfile | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.getRecord`);
    url.searchParams.append('repo', did);
    url.searchParams.append('collection', 'app.actor.profile');
    url.searchParams.append('rkey', 'self');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
      return null;
    }

    const userProfile = await response.json() as userProfile;
    return userProfile;
  } catch (e) {
    console.error('fetchUserProfile error:', e);
    return null;
  }
}

export type RecordType = {
  $type: string;
  [key: string]: any;
};

export async function writePDS(agent: AtpAgent, accessJwt: string, didKey: string, keyStoreClient: KeystoreClient, params: {
  record: RecordType
  did: string
  rkey: string
  type?: 'update' | 'create' | 'delete'
}): Promise<boolean | null> {
  try {
    const operateType = params.type || 'create'
    agent.setHeader('Authorization', `Bearer ${accessJwt}`);

    const rkey = params.rkey || TID.next().toString()

    const newRecord = {
      created: new Date().toISOString(),
      ...params.record,
    }

    const preWriteTypeMap = {
      create: "fans.web5.ckb.preDirectWrites#create" as const,
      update: "fans.web5.ckb.preDirectWrites#update" as const,
      delete: "fans.web5.ckb.preDirectWrites#delete" as const,
    }

    const preWriteRes = await agent.fans.web5.ckb.preDirectWrites({
      repo: params.did,
      writes: [{
        $type: preWriteTypeMap[operateType],
        collection: newRecord.$type,
        rkey,
        value: newRecord
      }],
      validate: false,
    });

    const preWriterData = preWriteRes.data;

    const uncommit: UnsignedCommit = {
      did: preWriterData.did,
      version: 3,
      rev: preWriterData.rev,
      prev: preWriterData.prev ? CID.parse(preWriterData.prev) : null,
      data: CID.parse(preWriterData.data),
    };
    const unSignBytes = cbor.encode(uncommit)
    // remove 0x prefix
    const unSignBytesHex = hexFrom(unSignBytes).slice(2);
    if (unSignBytesHex !== preWriterData.unSignBytes) {
      console.error('sign bytes not consistent', unSignBytesHex, preWriterData.unSignBytes)
      return null;
    }

    const sig = await keyStoreClient.signMessage(unSignBytes);

    const writeTypeMap = {
      create: "fans.web5.ckb.directWrites#create" as const,
      update: "fans.web5.ckb.directWrites#update" as const,
      delete: "fans.web5.ckb.directWrites#delete" as const,
    }

    const writeRes = await agent.fans.web5.ckb.directWrites({
      repo: params.did,
      validate: false,
      signingKey: didKey,
      writes: [{
        $type: writeTypeMap[operateType],
        collection: newRecord.$type,
        rkey: params.rkey,
        value: newRecord
      }],
      root: {
        did: preWriterData.did,
        version: 3,
        rev: preWriterData.rev,
        prev: preWriterData.prev,
        data: preWriterData.data,
        signedBytes: hexFrom(sig),
      },
    });

    return writeRes.success;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

/*
$ curl -s "https://web5.bbsfans.dev/xrpc/com.atproto.repo.describeRepo?repo=did:ckb:ctjbk5hh2oidglaw23lp37dglicta2tk" | jq
{
  "handle": "david.web5.bbsfans.dev",
  "did": "did:ckb:ctjbk5hh2oidglaw23lp37dglicta2tk",
  "didDoc": {
    "verificationMethods": {
      "atproto": "did:key:zQ3shnekMFK6a6kS9sCeLATJjjbMzSsoHuCiGsTBnDSvEWiqC"
    },
    "alsoKnownAs": [
      "at://david.web5.bbsfans.dev"
    ],
    "services": {
      "atproto_pds": {
        "type": "AtprotoPersonalDataServer",
        "endpoint": "https://web5.bbsfans.dev"
      }
    }
  },
  "collections": [
    "app.actor.profile",
    "app.bsky.actor.profile",
    "app.bsky.feed.post",
    "app.bsky.graph.follow"
  ],
  "handleIsCorrect": true
}
*/

export type RepoInfo = {
  handle: string;
  did: string;
  didDoc: {
    verificationMethods: Record<string, string>;
    alsoKnownAs: string[];
    services: Record<string, {
      type: string;
      endpoint: string;
    }>;
  };
  collections: string[];
  handleIsCorrect: boolean;
};

export async function fetchRepoInfo(did: string, pdsAPIUrl: string): Promise<RepoInfo | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.describeRepo`);
    url.searchParams.append('repo', did);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo info: ${response.status} ${response.statusText}`);
      return null;
    }

    const repoInfo = await response.json();
    return repoInfo;
  } catch (e) {
    console.error('fetchRepoInfo error:', e);
    return null;
  }
}

/*
curl -s "https://web5.bbsfans.dev/xrpc/com.atproto.repo.listRecords?repo=did:ckb:ctjbk5hh2oidglaw23lp37dglicta2tk&collection=app.actor.profile&limit=100"
{
    "cursor": "self",
    "records": [
        {
            "uri": "at://did:ckb:ctjbk5hh2oidglaw23lp37dglicta2tk/app.actor.profile/self",
            "cid": "bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di",
            "value": {
                "uri": "at://did:ckb:ctjbk5hh2oidglaw23lp37dglicta2tk/app.actor.profile/self",
                "cid": "bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di",
                "value": {
                    "$type": "app.actor.profile",
                    "created": "2026-01-24T05:45:13.859Z",
                    "description": "哈哈哈哈",
                    "displayName": "david111"
                }
            }
        }
    ]
}
next page by cursor:
$ curl -s "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:pzeifei2oec4vx5a35py4knv&collection=app.bsky.feed.post&cursor=3ltlqcmqdk225"
{"records":[]}
*/

export type RepoRecords = {
  cursor?: string;
  records: {
    uri: string;
    cid: string;
    value: Record<string, any>;
  }[];
};

export async function fetchRepoRecords(did: string, collection: string, pdsAPIUrl: string, limit?: number, cursor?: string): Promise<RepoRecords | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.append('repo', did);
    url.searchParams.append('collection', collection);
    url.searchParams.append('limit', limit?.toString() || '10'); 
    if (cursor) {
      url.searchParams.append('cursor', cursor);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo records: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('fetchRepoRecords error:', e);
    return null;
  }
}

/*
curl -s 'https://agrocybe.us-west.host.bsky.network/xrpc/com.atproto.sync.listBlobs?did=did%3Aplc%3Apzeifei2oec4vx5a35py4knv&limit=1000'
{"cursor":"bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di","cids":["bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di"]}
pic url： https://agrocybe.us-west.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:pzeifei2oec4vx5a35py4knv&cid=bafkreif52ptsjaiclntwv4p3squl3yus5tlkac45zxjsbnmupnocx6lmpq

web5 pds (rsky) does not use blobs; images and similar assets are stored in OSS, and only their URLs are kept in the PDS.
$ curl -s 'https://web5.bbsfans.dev/xrpc/com.atproto.sync.listBlobs?did=did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo&limit=1000'
{"cids":[]}
*/
export type RepoBlobs = {
  cursor?: string;
  cids: string[];
};

export async function fetchRepoBlobs(did: string, pdsAPIUrl: string, limit?: number, cursor?: string): Promise<RepoBlobs | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.sync.listBlobs`);
    url.searchParams.append('did', did);
    url.searchParams.append('limit', limit?.toString() || '10');
    if (cursor) {
      url.searchParams.append('cursor', cursor);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo blobs: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('fetchRepoBlobs error:', e);
    return null;
  }
}

/*
curl -L -o "repo_jler.car" "https://web5.bbsfans.dev/xrpc/com.atproto.sync.getRepo?did=did:ckb:52vmubyl4y3al5k246owb7nhkmwhwgx7"
incremental car:
curl -L -o "repo_jler_incremental.car" "https://web5.bbsfans.dev/xrpc/com.atproto.sync.getRepo?did=did:ckb:52vmubyl4y3al5k246owb7nhkmwhwgx7&since=bafyreiaoy4e5d4rhkagogxwmi7hg2fpft6u3buc7tmidmt3ry4eqdut2di"
 */
export async function exportRepoCar(did: string, pdsAPIUrl: string, since?: string): Promise<ArrayBuffer | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.sync.getRepo`);
    url.searchParams.append('did', did);
    if (since) {
      url.searchParams.append('since', since);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Failed to fetch repo car: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.arrayBuffer();
    return data;
  } catch (e) {
    console.error('fetchRepoCar error:', e);
    return null;
  }
}

/*
curl -X POST "$PDS_URL/xrpc/com.atproto.repo.importRepo" \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/vnd.ipld.car" \
     --data-binary @repo_jler.car
*/

export async function importRepoCar(did: string, pdsAPIUrl: string, car: ArrayBuffer, accessToken: string): Promise<boolean | null> {
  try {
    const url = new URL(`https://${pdsAPIUrl}/xrpc/com.atproto.repo.importRepo`);
    url.searchParams.append('did', did);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.ipld.car',
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: car,
    });

    if (!response.ok) {
      console.error(`Failed to import repo car: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error('importRepoCar error:', e);
    return null;
  }
}


// util function for relayer

/*
$ curl -s "https://relayer.bbsfans.dev/xrpc/_health"
{"status":"ok"}
*/

/*
$ curl -sS "https://relayer.bbsfans.dev/xrpc/com.atproto.sync.getLatestCommit?did=did:ckb:hulihw5j57scbpqztqcsxzast4slaxfo"
{"cid":"bafyreidife7vadje5nrdss36juz4azsf3qm7sq3myltdb22v3oe7csiah4","rev":"3mdmyyuk67fgm"}
*/


/*
$ websocat wss://relayer.bbsfans.dev/xrpc/com.atproto.sync.subscribeRepos
atg#commitbopcopsccid�X%q Z2 �f<�6�C��][�dpathxapp.bbs.like/3mdtvplexqs2kfactionfcreatecrevm3mdtvplidhlhacseq�repox(did:ckb:52vmubyl4y3al5k246owb7nhkmwhwgx7dtimex2026-02-02T03:28:37.631Zeblobsesincem3mdhe7u4utwp7fblocksY�eroots�X%q d�<cg"!�U

返回结果是二进制帧。subscribeRepos 通过 WebSocket 发送 CBOR 编码的事件帧，事件体里还会嵌入 CAR（IPLD/CBOR）区块切片用于承载记录数据。
- 帧格式见代码：先读 header，再根据 MsgType 读具体事件（#commit、#sync、#identity、#account、#info、#labels），全是 CBOR 二进制，所以直接在终端显示会是不可读字节流

https://skyware.js.org/guides/firehose/introduction/getting-started/
*/
