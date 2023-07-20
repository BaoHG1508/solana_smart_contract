import { assert } from "chai";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import BN from "bn.js";
import { AnchorProvider } from "@project-serum/anchor";

const anchor = require("@project-serum/anchor");

describe("UpgradeWeapon", () => {
  const provider = AnchorProvider.env();

  let _upgradeWeapon = anchor.web3.Keypair.generate();

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
        upgradeWeapon: _upgradeWeapon.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [_upgradeWeapon],
    });

    const account = await program.account.upgradeWeapon.fetch(
      _upgradeWeapon.publicKey
    );

    assert.ok(account.symbol === "UWP");
  });

  it("should add token type", async () => {
    const myAccount = _upgradeWeapon;
    const index = 0;

    while (index < 3) {
      await program.rpc.addTokenType(
        `https://testapi.ambros.app/erc/721/upgrade-weapon/${index}`,
        {
          accounts: {
            upgradeWeapon: myAccount.publicKey,
            user: authority.publicKey,
            systemProgram: SystemProgram.programId,
          },
          signers: [anchor.AnchorProvider.env().wallet.payer],
        }
      );
    }

    const account = await program.account.upgradeWeapon.fetch(
      myAccount.publicKey
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
    const upgradeWeaponAccount = _upgradeWeapon;

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

    const txSig = await program.methods
      .mint(new BN(0))
      .accounts({
        upgradeWeapon: upgradeWeaponAccount.publicKey,
        mint: mintKey.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        authority: authority.publicKey,
        metadataAccount: metadataAddress,
        tokenAccount: tokenAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        edition: metadataEditionAddress,
      })
      .signers([mintKey])
      .rpc();

    assert.exists(txSig);
  });

  it("should burn the token", async () => {
    const program = anchor.workspace.UpgradeWeapon;

    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: key,
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

    const txSig = await program.methods
      .burn()
      .accounts({
        mint: mintKey.publicKey,
        associationTokenAccount: tokenAddress,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataAccount: metadataAddress,
        metadataEditionAccount: metadataEditionAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([authority.payer])
      .rpc();

    assert.exists(txSig);
  });
});
