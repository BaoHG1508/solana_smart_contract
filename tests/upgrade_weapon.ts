import { assert } from "chai";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import BN from "bn.js";
import { AnchorProvider } from "@project-serum/anchor";
import { bool, publicKey, struct, u32, u64, u8 } from "@project-serum/borsh";
import * as borsh from "@project-serum/borsh";
import { Metaplex } from "@metaplex-foundation/js";

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
    await program.rpc.initialize("UpgradeWeapon", "UWP", {
      accounts: {
        upgradeWeapon: upgradeWeaponAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [upgradeWeaponAccount],
    });

    const account = await program.account.upgradeWeapon.fetch(
      upgradeWeaponAccount.publicKey
    );

    assert.ok(account.symbol === "UWP");
  });

  it("should add token type", async () => {

    await program.rpc.addTokenType(
      `https://testapi.ambros.app/erc/721/upgrade-weapon/0`,
      `Fire Wand`,
      {
        accounts: {
          upgradeWeapon: upgradeWeaponAccount.publicKey,
          user: authority.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [authority.payer],
      }
    );

    await program.rpc.addTokenType(
      `https://testapi.ambros.app/erc/721/upgrade-weapon/1`,
      `Goblet of Fire`,
      {
        accounts: {
          upgradeWeapon: upgradeWeaponAccount.publicKey,
          user: authority.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [authority.payer],
      }
    );


    await program.rpc.addTokenType(
      `https://testapi.ambros.app/erc/721/upgrade-weapon/2`,
      `Frost Wand`,
      {
        accounts: {
          upgradeWeapon: upgradeWeaponAccount.publicKey,
          user: authority.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [authority.payer],
      }
    );

    await program.rpc.addTokenType(
      `https://testapi.ambros.app/erc/721/upgrade-weapon/3`,
      `Celestial Wand`,
      {
        accounts: {
          upgradeWeapon: upgradeWeaponAccount.publicKey,
          user: authority.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [authority.payer],
      }
    );
    const account = await program.account.upgradeWeapon.fetch(
      upgradeWeaponAccount.publicKey
    );

    assert.ok(
      account.tokenTypeUris[0].tokenUri ===
        "https://testapi.ambros.app/erc/721/upgrade-weapon/0"
    );

    assert.ok(
      account.tokenTypeUris[1].tokenUri ===
        "https://testapi.ambros.app/erc/721/upgrade-weapon/1"
    );

    assert.ok(
      account.tokenTypeUris[2].tokenUri ===
        "https://testapi.ambros.app/erc/721/upgrade-weapon/2"
    );

    assert.ok(
      account.tokenTypeUris[3].tokenUri ===
        "https://testapi.ambros.app/erc/721/upgrade-weapon/3"
    );
  });

  it("Mint a token", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: authority.publicKey,
    });

    const deviceAccount = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("device"), Buffer.from("device_id_1")],
        new PublicKey("HbtfwD3hs3jzJmAAf6TmVA7m28Xmj78HgPuehVM6cWbe")
      )
    )[0];

    console.log('===============deviceData====================');
    console.log(deviceAccount);
    console.log('===================================');

    const metadataAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];

    const metadataEditionAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKey.publicKey.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];

    const weaponAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("weapon"), mintKey.publicKey.toBuffer()],
        new PublicKey("HbtfwD3hs3jzJmAAf6TmVA7m28Xmj78HgPuehVM6cWbe")
      )
    )[0];

    try{
      const txSig = await program.methods
      .mint(new BN(0))
      .accounts({
        upgradeWeapon: upgradeWeaponAccount.publicKey,
        mint: mintKey.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        authority: authority.publicKey,
        metadataAccount: metadataAddress,
        weaponAccount: weaponAddress,
        tokenAccount: tokenAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        edition: metadataEditionAddress,
        deviceAccount:deviceAccount ,
      })
      .signers([mintKey])
      .rpc();

      assert.exists(txSig);
    } catch(e){
      console.log('===================================');
      console.log(e);
      console.log('===================================');
    }
  });
});
