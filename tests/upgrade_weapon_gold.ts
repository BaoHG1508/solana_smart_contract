import { assert } from "chai";
import { SystemProgram, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
const anchor = require("@project-serum/anchor");

describe("UpgradeWeaponGold", () => {
  const provider = AnchorProvider.env();

  anchor.setProvider(provider);

  const mint = anchor.web3.Keypair.generate();

  const authority = anchor.AnchorProvider.env().wallet;

  const programAddress = anchor.web3.Keypair.generate();

  const program = anchor.workspace.UpgradeWeaponGold;

  const ataProgram = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  it("should initialize the UpgradeWeaponGold", async () => {
    await program.rpc.initialize("UpgradeWeaponGold", "GOLD", {
      accounts: {
        upgradeWeaponGold: programAddress.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [programAddress],
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

    await program.rpc.mint(new BN(1030), {
      accounts: {
        mint: mint.publicKey,
        tokenAccount: tokenAddress,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        associatedTokenProgram: ataProgram,
      },
      signers: [mint],
    });

    const mintInfo = await program.provider.connection.getParsedAccountInfo(
      tokenAddress
    );

    assert.ok(mintInfo.value.data.parsed.info.tokenAmount.uiAmount === 1030);
  });

  it("should burn 1000 tokens", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mint.publicKey,
      owner: authority.publicKey,
    });

    await program.rpc.burn(new BN(1000), {
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

    assert.ok(mintInfo.value.data.parsed.info.tokenAmount.uiAmount === 30);
  });
});
