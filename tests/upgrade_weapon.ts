import { assert } from "chai";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import BN from "bn.js";
import { AnchorProvider } from "@project-serum/anchor";
import { bool, publicKey, struct, u32, u64, u8 } from "@project-serum/borsh";
import * as borsh from "@project-serum/borsh";
import { Metaplex } from "@metaplex-foundation/js";
import { Connection, clusterApiUrl} from "@solana/web3.js";

const anchor = require("@project-serum/anchor");

describe("UpgradeWeapon", () => { 
  const provider = AnchorProvider.env();

  let upgradeWeaponAccount = anchor.web3.Keypair.generate();

  anchor.setProvider(provider);

  const mintKey = anchor.web3.Keypair.generate();

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const program = anchor.workspace.UpgradeWeapon;

  const authority = anchor.AnchorProvider.env().wallet;

  it("should initialize the UpgradeWeapon", async () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const metaplex = new Metaplex(connection);

    const owner = new PublicKey("A1cjGLEjuiw946mrHFCcWZggQDW89j3ViaqBXLsfojaF");
    const allNFTs = await metaplex.nfts().findAllByOwner({
      owner: owner,
    });

    console.log(allNFTs);
  });
});
