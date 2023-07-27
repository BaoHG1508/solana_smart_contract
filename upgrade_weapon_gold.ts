import { assert } from "chai";
import { SystemProgram, PublicKey, Keypair, Connection } from "@solana/web3.js";
import { AnchorProvider, BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { publicKey } from "@project-serum/borsh";
import { createKeypairFromFile } from "./util";
const anchor = require("@project-serum/anchor");

describe("UpgradeWeaponGold", async () => {
  const provider = AnchorProvider.env();

  anchor.setProvider(provider);

  const mint = anchor.web3.Keypair.generate();

  const authority = anchor.AnchorProvider.env().wallet;
  let authority2;

  console.log("=================console.log==================");
  console.log(mint.publicKey);
  console.log(mint);
  console.log("===================================");

  const programAddress = anchor.web3.Keypair.generate();

  const program = anchor.workspace.UpgradeWeaponGold;

  const ataProgram = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  it("should initialize the UpgradeWeaponGold", async () => {
    authority2 = await createKeypairFromFile();
    const connection = new Connection("http://localhost:8899", "confirmed");
    const myAddress = new PublicKey(authority2.publicKey);
    const signature = await connection.requestAirdrop(myAddress, 1000000000);
    await connection.confirmTransaction(signature);
    const balance = await provider.connection.getBalance(authority2.publicKey);

    await program.rpc.initialize({
      accounts: {
        upgradeWeaponGold: programAddress.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        mint: mint.publicKey,
      },
      signers: [programAddress, mint, authority.payer],
    });

    const account = await program.account.upgradeWeapon.fetch(
      programAddress.publicKey
    );

    assert.ok(account.symbol === "GOLD");
  });

  it("should mint 1030 tokens", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: authority.publicKey,
    });

    const tokenAddress2 = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: authority2.publicKey,
    });

    await program.rpc.mint(new BN(1030), {
      accounts: {
        mint: mint.publicKey,
        tokenAccount: tokenAddress2,
        to: authority2.publicKey,
        authority: authority.publicKey,

        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ataProgram,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [mint, authority.payer, authority2],
    });

    const mintInfo3 = await program.provider.connection.getParsedAccountInfo(
      tokenAddress2
    );

    console.log("===================================");
    console.log(tokenAddress2);
    console.log("===================================");

    assert.ok(mintInfo3.value.data.parsed.info.tokenAmount.uiAmount === 1030);
  });

  it("should burn 1000 tokens", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: authority2.publicKey,
    });

    await program.rpc.burn(new BN(30), {
      accounts: {
        mint: mint.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associationTokenAccount: tokenAddress,
      },
      signers: [authority.payer],
    });
    const mintInfo = await program.provider.connection.getParsedAccountInfo(
      tokenAddress
    );

    console.log("===================================");
    console.log(mintInfo.value.data.parsed.info.tokenAmount);
    console.log("===================================");

    assert.ok(mintInfo.value.data.parsed.info.tokenAmount.uiAmount === 1000);
  });
});
