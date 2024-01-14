import { publicKey } from '@project-serum/borsh';
import { assert } from "chai";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import BN from "bn.js";
import { AnchorProvider } from "@project-serum/anchor";
import { Metaplex, Signer, keypairIdentity } from "@metaplex-foundation/js";
import { Connection, clusterApiUrl, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import base58 from 'bs58';
import * as borsh from "@project-serum/borsh";

const anchor = require("@project-serum/anchor");

describe("UpgradeWeapon", () => { 
  const provider = AnchorProvider.env();
  let upgradeWeaponAccount = anchor.web3.Keypair.generate();

  console.log('===================================');
  console.log(upgradeWeaponAccount.publicKey.toBase58());
  console.log('===================================');

  anchor.setProvider(provider);

  const mintKey = anchor.web3.Keypair.generate();

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const program = anchor.workspace.UpgradeWeapon;

  const authority = anchor.AnchorProvider.env().wallet;

  it("should initialize the UpgradeWeapon", async () => {
    await program.rpc.initialize("Arcane Arsenal", "AA", {
      accounts: {
        upgradeWeapon: upgradeWeaponAccount.publicKey,
        user: authority.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [upgradeWeaponAccount],
    });
    

    const account = await program.account.upgradeWeapon.fetch(
      upgradeWeaponAccount.publicKey
    );

    console.log('===================================');
    console.log(account);
    console.log('===================================');

    assert.ok(account.symbol === "AA");
  });

  it("should add token type", async () => {
    const tokenTypeData = [
      {
        tokenUri: "https://testapi.ambros.app/erc/721/upgrade-weapon/0",
        name: "Moon Lotus",
      },
      {
        tokenUri: "https://testapi.ambros.app/erc/721/upgrade-weapon/1",
        name: "Daybreaker",
      },
      {
        tokenUri: "https://testapi.ambros.app/erc/721/upgrade-weapon/2",
        name: "Spellsong",
      },
      {
        tokenUri: "https://testapi.ambros.app/erc/721/upgrade-weapon/3",
        name: "Starlight",
      },
      {
        tokenUri: "https://testapi.ambros.app/erc/721/upgrade-weapon/4",
        name: "Solar cane",
      },
    ];
    
      await program.rpc.addTokenTypes(
        tokenTypeData.map((it) => it.tokenUri),
        tokenTypeData.map((it) => it.name),
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
        "https://api.ambros.app/erc/721/upgrade-weapon/0"
    );
  });


  it("Mint a token", async () => {  
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: authority.publicKey,
    });

    const nftAccount = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("mintedNFT"), authority.publicKey.toBuffer()],
        new PublicKey("C7KQdF6atRDnJe9cCLomcESLFZCtYa9SEpRT5i9Y4J3u")
      )
    )[0];

    console.log('===============nftAccount====================');
    console.log(nftAccount);
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
        new PublicKey("C7KQdF6atRDnJe9cCLomcESLFZCtYa9SEpRT5i9Y4J3u")
      )
    )[0];

    try{


      const additionalComputeBudgetInstruction =
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000,
      });

      const collectionMint = new PublicKey("24wrBYYngSuLvcyNJPkPVwDb9ifJGTLh6DZPQjYzfmoV");

      const collectionMetadata = (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];

      const collectionEdition = (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            collectionMint.toBuffer(),
            Buffer.from("edition"),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];


      const txSig = await program.methods.
      mint(new BN(4))
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
        owner: authority.publicKey,
        collectionMint: collectionMint,
        collection: collectionMetadata,
        collectionMasterEdition: collectionEdition,
        nftAccount: nftAccount,
      })
      .preInstructions([additionalComputeBudgetInstruction])
      .signers([mintKey, authority.payer])
      .rpc();

      console.log('===================================');
      console.log(txSig);
      console.log('===================================');

      assert.exists(txSig);

      } catch(e){
        console.log(e);
      }
  });

  it("Should upgrade the weapon", async () => {
    const tokenAddress = await anchor.utils.token.associatedAddress({
      mint: mintKey.publicKey,
      owner: authority.publicKey,
    });

    const weaponAddress = (
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("weapon"), mintKey.publicKey.toBuffer()],
        new PublicKey("C7KQdF6atRDnJe9cCLomcESLFZCtYa9SEpRT5i9Y4J3u")
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
