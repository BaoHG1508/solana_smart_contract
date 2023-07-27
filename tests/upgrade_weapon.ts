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

  console.log(
    "===============upgradeWeaponAccount.publicKey===================="
  );
  console.log(upgradeWeaponAccount.publicKey);
  console.log("===================================");

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
    let index = 0;

    while (index < 3) {
      await program.rpc.addTokenType(
        `https://testapi.ambros.app/erc/721/upgrade-weapon/${index}`,
        `Fire Wand ${index}`,
        {
          accounts: {
            upgradeWeapon: upgradeWeaponAccount.publicKey,
            user: authority.publicKey,
            systemProgram: SystemProgram.programId,
          },
          signers: [authority.payer],
        }
      );
      index = index + 1;
    }

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
  });

  it("Mint a token", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: authority.publicKey,
    });

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

    console.log("=================metadataAddress==================");
    console.log(metadataAddress);
    console.log("===================================");

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

    console.log("=================metadataAddress==================");
    console.log(metadataAddress);
    console.log("===================================");

    const weaponAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("weapon"), mintKey.publicKey.toBuffer()],
        new PublicKey("HbtfwD3hs3jzJmAAf6TmVA7m28Xmj78HgPuehVM6cWbe")
      )
    )[0];

    console.log("=================weaponAddress==================");
    console.log(weaponAddress);
    console.log("===================================");

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
      })
      .signers([mintKey])
      .rpc();

    const mintInfo = await provider.connection.getAccountInfo(weaponAddress);

    const borshAccountSchema = borsh.struct([
      borsh.u64("level"),
      borsh.u64("hp"),
      borsh.u64("damage"),
      borsh.u64("mana"),
      borsh.u64("mpRegen"),
      borsh.u64("atkSpeed"),
    ]);

    const deseralizedInfo = borshAccountSchema.decode(
      mintInfo.data.slice(8, mintInfo.data.length)
    );

    const metaplex = new Metaplex(provider.connection);
    console.log("=================weaponAddress==================");
    console.log(weaponAddress);
    console.log("===================================");
    console.log("=================metadataAddress==================");
    console.log(metadataAddress);
    console.log("===================================");


    assert.exists(txSig);
  });

  it("Should upgrade the weapon", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: authority.publicKey,
    });

    const weaponAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("weapon"), mintKey.publicKey.toBuffer()],
        new PublicKey("HbtfwD3hs3jzJmAAf6TmVA7m28Xmj78HgPuehVM6cWbe")
      )
    )[0];

    await program.methods
      .upgradeWeaponLevel([
        new BN(20),
        new BN(21),
        new BN(21),
        new BN(21),
        new BN(21),
        new BN(21),
      ])
      .accounts({
        owner: authority.publicKey,
        weaponAccount: weaponAddress,
        tokenAccount: tokenAddress,
      })
      .signers([authority.payer])
      .rpc();

    const mintInfo = await provider.connection.getAccountInfo(weaponAddress);

    console.log("===================================");
    console.log(mintInfo.data);
    console.log("===================================");

    const borshAccountSchema = borsh.struct([
      borsh.u64("level"),
      borsh.u64("hp"),
      borsh.u64("damage"),
      borsh.u64("mana"),
      borsh.u64("mpRegen"),
      borsh.u64("atkSpeed"),
    ]);

    const deseralizedInfo = borshAccountSchema.decode(
      mintInfo.data.slice(8, mintInfo.data.length)
    );

    console.log("===================================");
    console.log(deseralizedInfo);
    console.log("===================================");

    assert.ok(deseralizedInfo.hp === 20);
  });
});
