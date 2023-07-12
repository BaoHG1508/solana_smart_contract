import { assert } from "chai";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

import BN from "bn.js";
import { AnchorProvider } from "@project-serum/anchor";

const anchor = require("@project-serum/anchor");

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("UpgradeWeapon", () => {
  const provider = AnchorProvider.env();

  let _upgradeWeapon;

  anchor.setProvider(provider);

  const mintKey = anchor.web3.Keypair.generate();

  it("should initialize the UpgradeWeapon", async () => {
    const program = anchor.workspace.UpgradeWeapon;

    const myAccount = anchor.web3.Keypair.generate();
    _upgradeWeapon = myAccount;

    await program.rpc.initialize("UpgradeWeapon", "UWP", {
      accounts: {
        upgradeWeapon: myAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [myAccount],
    });

    const account = await program.account.upgradeWeapon.fetch(
      myAccount.publicKey
    );

    assert.ok(account.symbol === "UWP");
  });

  it("should add token type", async () => {
    const program = anchor.workspace.UpgradeWeapon;

    const myAccount = _upgradeWeapon;
    const key = anchor.AnchorProvider.env().wallet.publicKey;

    await program.rpc.addTokenType(
      "https://testapi.ambros.app/erc/721/upgrade-weapon/0",
      {
        accounts: {
          upgradeWeapon: myAccount.publicKey,
          user: key,
          systemProgram: SystemProgram.programId,
        },
        signers: [anchor.AnchorProvider.env().wallet.payer],
      }
    );

    const account = await program.account.upgradeWeapon.fetch(
      myAccount.publicKey
    );

    assert.ok(
      account.tokenTypeUris[0].tokenUri ===
        "https://testapi.ambros.app/erc/721/upgrade-weapon/0"
    );
  });

  it("Mint a token", async () => {
    const program = anchor.workspace.UpgradeWeapon;

    const key = anchor.AnchorProvider.env().wallet.publicKey;
    const upgradeWeaponAccount = _upgradeWeapon;

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

    await program.methods
      .mint(new BN(0))
      .accounts({
        upgradeWeapon: upgradeWeaponAccount.publicKey,
        mint: mintKey.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        authority: key,
        metadataAccount: metadataAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenAccount: tokenAddress,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([mintKey])
      .rpc();

    const mintInfo = await program.provider.connection.getParsedAccountInfo(
      mintKey.publicKey
    );

    assert.equal(mintInfo.value.data.parsed.info.isInitialized, true);
  });

  it("should transfer a token", async () => {
    const to = anchor.web3.Keypair.generate();

    const program = anchor.workspace.UpgradeWeapon;

    const userWallet = anchor.AnchorProvider.env().wallet;

    const toAta = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: to.publicKey,
    });

    const fromAta = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: userWallet.publicKey,
    });

    const a = await program.methods
      .transfer()
      .accounts({
        from: userWallet.publicKey,
        fromAssociationTokenAccount: fromAta,
        to: to.publicKey,
        toAssociationTokenAccount: toAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mint: mintKey.publicKey,
      })
      .signers([userWallet.payer])
      .rpc();

    const mintInfo = await getAccount(provider.connection, toAta);

    assert(mintInfo.amount === BigInt(1));
  });
});

