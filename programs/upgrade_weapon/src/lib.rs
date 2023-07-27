use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{MintTo, Token};
use mpl_token_metadata;
use std::mem::size_of;

declare_id!("HbtfwD3hs3jzJmAAf6TmVA7m28Xmj78HgPuehVM6cWbe");

#[program]
mod upgrade_weapon {
    use anchor_lang::system_program;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String) -> ProgramResult {
        msg!("Initializing upgrade weapon program");
        let upgrade_weapon = &mut ctx.accounts.upgrade_weapon;
        upgrade_weapon.token_counter = 0;
        upgrade_weapon.token_type_counter = 0;
        upgrade_weapon.name = name;
        upgrade_weapon.symbol = symbol;
        upgrade_weapon.token_types = vec![];
        upgrade_weapon.token_type_uris = vec![];

        Ok(())
    }

    pub fn mint(ctx: Context<MintToken>, token_type: u8) -> ProgramResult {
        let upgrade_weapon = &mut ctx.accounts.upgrade_weapon;

        anchor_lang::system_program::create_account(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
            ),
            10000000,
            82,
            &ctx.accounts.token_program.key(),
        )?;

        anchor_spl::token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::InitializeMint {
                    mint: ctx.accounts.mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            0,
            &ctx.accounts.authority.key(),
            Some(&ctx.accounts.authority.key()),
        )?;

        anchor_spl::associated_token::create(CpiContext::new(
            ctx.accounts.token_account.to_account_info(),
            anchor_spl::associated_token::Create {
                payer: ctx.accounts.authority.to_account_info(),
                associated_token: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ))?;

        // Create the MintTo struct for our context
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        let token_id: u64 = upgrade_weapon.token_type_counter;
        let u64_token_type: u64 = token_type.into();

        upgrade_weapon.token_types.push(TokenType {
            id: token_id,
            token_type: u64_token_type,
        });

        upgrade_weapon.token_counter += 1;

        // Execute anchor's helper function to mint tokens
        anchor_spl::token::mint_to(cpi_ctx, 1)?;

        msg!("Token mint process successfully.");

        let index = upgrade_weapon
            .token_type_uris
            .iter()
            .position(|t| t.id == u64_token_type)
            .unwrap();
        let token_type_uri = upgrade_weapon.token_type_uris[index].clone();

        invoke(
            &mpl_token_metadata::instruction::create_metadata_accounts_v3(
                mpl_token_metadata::ID,
                ctx.accounts.metadata_account.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.authority.key(),
                token_type_uri.name.clone(),
                upgrade_weapon.symbol.clone(),
                token_type_uri.token_uri + "/2/" + &ctx.accounts.weapon_account.key().to_string(),
                None,
                1,
                true,
                false,
                None,
                None,
                None,
            ),
            &[
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_account.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
        )?;

        msg!("Token mint process completed successfully.");

        invoke(
            &mpl_token_metadata::instruction::create_master_edition_v3(
                mpl_token_metadata::ID,
                ctx.accounts.edition.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.metadata_account.key(),
                ctx.accounts.authority.key(),
                None,
            ),
            &[
                ctx.accounts.edition.to_account_info(),
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_account.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.rent.to_account_info(),
            ],
        )?;

        let metadata_acc: &mut Account<'_, Weapon> = &mut ctx.accounts.weapon_account;

        metadata_acc.level = 0;
        metadata_acc.hp = 0;
        metadata_acc.damage = 0;
        metadata_acc.mana = 0;
        metadata_acc.mp_regen = 0;
        metadata_acc.atk_speed = 0;

        Ok(())
    }

    pub fn add_token_type(
        ctx: Context<AddTokenType>,
        token_uri: String,
        name: String,
    ) -> ProgramResult {
        let upgrade_weapon = &mut ctx.accounts.upgrade_weapon;

        msg!("Adding token");
        msg!(&token_uri);

        let token_type_counter = upgrade_weapon.token_type_counter;

        msg!(&token_type_counter.to_string());

        upgrade_weapon.token_type_uris.push(TokenTypeURI {
            id: token_type_counter,
            token_uri,
            name,
        });
        upgrade_weapon.token_type_counter += 1;

        Ok(())
    }

    pub fn set_token_type_uri(
        ctx: Context<SetTokenTypeURI>,
        token_type: u64,
        token_uri: String,
    ) -> ProgramResult {
        let upgrade_weapon = &mut ctx.accounts.upgrade_weapon;

        if token_type >= upgrade_weapon.token_type_counter {
            return Err(ErrorCode::InvalidTokenType.into());
        }

        let index = upgrade_weapon
            .token_type_uris
            .iter()
            .position(|t| t.id == token_type)
            .unwrap();
        upgrade_weapon.token_type_uris[index].token_uri = token_uri;

        Ok(())
    }

    pub fn token_uri(ctx: Context<TokenURI>, token_id: u64) -> ProgramResult {
        let upgrade_weapon = &ctx.accounts.upgrade_weapon;

        if !upgrade_weapon.token_types.iter().any(|t| t.id == token_id) {
            return Err(ErrorCode::InvalidTokenId.into());
        }

        let token_type = upgrade_weapon
            .token_types
            .iter()
            .find(|t| t.id == token_id)
            .unwrap()
            .token_type;

        let token_type_uri = upgrade_weapon
            .token_type_uris
            .iter()
            .find(|t| t.id == token_type)
            .unwrap()
            .token_uri
            .clone();

        let token_account = &ctx.accounts.token_account;
        if token_account.owner != ctx.accounts.user.key() {
            return Err(ErrorCode::InvalidTokenOwner.into());
        }

        emit!(TokenURISuccess {
            token_uri: token_type_uri
        });

        Ok(())
    }

    // Define account structures

    #[account]
    pub struct UpgradeWeapon {
        pub token_counter: u64,
        pub token_type_counter: u64,
        pub token_types: Vec<TokenType>,
        pub token_type_uris: Vec<TokenTypeURI>,
        pub name: String,
        pub symbol: String,
    }

    #[derive(Accounts)]
    pub struct MintToken<'info> {
        /// CHECK: This is the token that we want to mint
        #[account(mut)]
        pub mint: Signer<'info>,

        /// CHECK: This is the token account that we want to mint tokens to
        #[account(mut)]
        pub token_account: UncheckedAccount<'info>,

        #[account(mut)]
        pub upgrade_weapon: Box<Account<'info, UpgradeWeapon>>,
        /// CHECK: the authority of the mint account
        #[account(mut)]
        pub authority: Signer<'info>,

        /// CHECK: We will create this outside
        #[account(mut)]
        pub metadata_account: UncheckedAccount<'info>,

        /// CHECK: We will create this outside
        #[account(
            init,
            payer = authority,
            space = 8 + 2 + 4 + 200 + 1, seeds = [b"weapon", mint.key().as_ref()], bump
        )]
        pub weapon_account: Account<'info, Weapon>,

        /// CHECK: We will create this outside
        #[account(mut)]
        pub edition: UncheckedAccount<'info>,

        pub rent: Sysvar<'info, Rent>,

        /// CHECK: We will create this outside
        pub system_program: Program<'info, System>,
        /// CHECK: We will create this outside
        pub token_program: Program<'info, Token>,
        /// CHECK: We will create this outside
        pub token_metadata_program: UncheckedAccount<'info>,
        pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    }

    pub fn transfer(ctx: Context<Transfer>) -> ProgramResult {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx
                    .accounts
                    .from_association_token_account
                    .to_account_info(),
                to: ctx.accounts.to_association_token_account.to_account_info(),
                authority: ctx.accounts.from.to_account_info(),
            },
        );

        anchor_spl::token::transfer(cpi_ctx, 1)?;

        Ok(())
    }

    pub fn burn(ctx: Context<Burn>) -> ProgramResult {
        msg!("Burning token");

        invoke(
            &mpl_token_metadata::instruction::burn_nft(
                ctx.accounts.token_metadata_program.key(),
                ctx.accounts.metadata_account.key(),
                ctx.accounts.authority.key(),
                ctx.accounts.mint.key(),
                ctx.accounts.association_token_account.key(),
                ctx.accounts.metadata_edition_account.key(),
                ctx.accounts.token_program.key(),
                None,
            ),
            &[
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.association_token_account.to_account_info(),
                ctx.accounts.metadata_edition_account.to_account_info(),
            ],
        )?;
        msg!("Burning token completed");

        Ok(())
    }

    #[derive(Accounts)]
    pub struct Transfer<'info> {
        #[account(mut)]
        pub from: Signer<'info>,

        #[account(mut)]
        pub from_association_token_account: Account<'info, anchor_spl::token::TokenAccount>,

        #[account(mut)]
        pub mint: Account<'info, anchor_spl::token::Mint>,

        /// CHECK:
        #[account(mut)]
        pub to: UncheckedAccount<'info>,

        #[account(
            init_if_needed,
            payer = from,
            associated_token::mint = mint,
            associated_token::authority = to
        )]
        pub to_association_token_account: Account<'info, anchor_spl::token::TokenAccount>,

        pub system_program: Program<'info, System>,
        pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
        pub token_program: Program<'info, Token>,
    }

    #[derive(Accounts)]
    #[instruction(name: String, symbol: String)]
    pub struct Initialize<'info> {
        #[account(init, payer = user, space = 1000 + size_of::<UpgradeWeapon>())]
        pub upgrade_weapon: Box<Account<'info, UpgradeWeapon>>,
        #[account(mut)]
        /// CHECK: No checks through types are necessary for the `user` account.
        pub user: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    #[instruction(token_uri: String)]
    pub struct AddTokenType<'info> {
        #[account(mut)]
        pub upgrade_weapon: Box<Account<'info, UpgradeWeapon>>,
        #[account(signer)]
        /// CHECK: No checks through types are necessary for the `user` account.
        pub user: AccountInfo<'info>,
    }

    #[derive(Accounts)]
    #[instruction(token_type: u64, token_uri: String)]
    pub struct SetTokenTypeURI<'info> {
        #[account(mut)]
        pub upgrade_weapon: Box<Account<'info, UpgradeWeapon>>,
        #[account(signer)]
        /// CHECK: No checks through types are necessary for the `user` account.
        pub user: AccountInfo<'info>,
    }

    #[derive(Accounts)]
    #[instruction(token_id: u64)]
    pub struct TokenURI<'info> {
        #[account(mut)]
        pub upgrade_weapon: Box<Account<'info, UpgradeWeapon>>,
        #[account(signer)]
        /// CHECK: No checks through types are necessary for the `user` account.
        pub user: AccountInfo<'info>,
        pub token_account: Account<'info, TokenAccount>,
    }

    #[derive(Accounts)]
    pub struct Burn<'info> {
        /// CHECK: We will create this outside
        #[account(mut)]
        metadata_account: UncheckedAccount<'info>,
        #[account(mut)]
        pub authority: Signer<'info>,
        #[account(mut)]
        pub mint: Account<'info, anchor_spl::token::Mint>,
        #[account(mut)]
        pub association_token_account: Account<'info, anchor_spl::token::TokenAccount>,

        /// CHECK: We will create this outside
        #[account(mut)]
        pub metadata_edition_account: UncheckedAccount<'info>,

        /// CHECK: We will create this outside
        pub token_program: Program<'info, Token>,
        /// CHECK: We will create this outside
        pub token_metadata_program: UncheckedAccount<'info>,
    }

    #[account]
    pub struct TokenAccount {
        pub owner: Pubkey,
        pub token_id: u64,
    }

    // Define errors

    #[derive(Debug)]
    pub enum ErrorCode {
        InvalidTokenType,
        InvalidTokenId,
        InvalidTokenOwner,
        InvalidBalance
    }

    impl From<ErrorCode> for ProgramError {
        fn from(err: ErrorCode) -> ProgramError {
            match err {
                ErrorCode::InvalidTokenType => ProgramError::Custom(1),
                ErrorCode::InvalidTokenId => ProgramError::Custom(2),
                ErrorCode::InvalidTokenOwner => ProgramError::Custom(3),
                ErrorCode::InvalidBalance => ProgramError::Custom(4),
            }
        }
    }

    // Define events

    #[event]
    pub struct TokenURISuccess {
        pub token_uri: String,
    }

    // Define additional structs

    #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
    pub struct TokenType {
        pub id: u64,
        pub token_type: u64,
    }

    #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
    pub struct TokenTypeURI {
        pub id: u64,
        pub token_uri: String,
        pub name: String,
    }

    #[account]
    pub struct Weapon {
        level: u64,
        hp: u64,
        damage: u64,
        mana: u64,
        mp_regen: u64,
        atk_speed: u64,
    }

    #[derive(Accounts)]
    #[instruction(level: [u64; 6])]
    pub struct UpgradeWeaponLevel<'info> {
        #[account(mut)]
        pub owner: Signer<'info>,

        #[account(mut)]
        pub weapon_account: Account<'info, Weapon>,

        #[account(mut, address=solana_program::pubkey!("A1cjGLEjuiw946mrHFCcWZggQDW89j3ViaqBXLsfojaF"))]
        pub authority: Signer<'info>,

        #[account(mut)]
        pub mint: Account<'info, anchor_spl::token::Mint>,

        #[account(mut)]
        pub gold_account: Account<'info, anchor_spl::token::TokenAccount>,

        pub token_program: Program<'info, Token>,
    }

    pub fn upgrade_weapon_level(
        ctx: Context<UpgradeWeaponLevel>,
        level: [u64; 6],
    ) -> ProgramResult {
        let metadata_acc: &mut Account<'_, Weapon> = &mut ctx.accounts.weapon_account;
        let token_account = &mut ctx.accounts.gold_account;

        let current_hp = metadata_acc.hp;
        let current_damage = metadata_acc.damage;
        let current_mana = metadata_acc.mana;
        let current_mp_regen = metadata_acc.mp_regen;
        let current_atk_speed = metadata_acc.atk_speed;

        let burn_amount: u64 = {
            let hp_difference = level[1].saturating_sub(current_hp);
            let damage_difference = level[2].saturating_sub(current_damage);
            let mana_difference = level[3].saturating_sub(current_mana);
            let mp_regen_difference = level[4].saturating_sub(current_mp_regen);
            let atk_speed_difference = level[5].saturating_sub(current_atk_speed);

            let calculate_burn_amount = |diff, value| {
                if diff >= 1 {
                    value * 10 + 100
                } else {
                    0
                }
            };

            calculate_burn_amount(hp_difference, level[1])
                .saturating_add(calculate_burn_amount(damage_difference, level[2]))
                .saturating_add(calculate_burn_amount(mana_difference, level[3]))
                .saturating_add(calculate_burn_amount(mp_regen_difference, level[4]))
                .saturating_add(calculate_burn_amount(atk_speed_difference, level[5]))
        };


        msg!("Burn amount: {}", burn_amount);

        if token_account.amount < burn_amount {
            return Err(ErrorCode::InvalidBalance.into());
        }

        let cpi_ctx: CpiContext<'_, '_, '_, '_, anchor_spl::token::Burn<'_>> = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Burn {
                from: ctx.accounts.gold_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
 
        anchor_spl::token::burn(cpi_ctx, burn_amount)?;

        metadata_acc.level = level[0];
        metadata_acc.hp = level[1];
        metadata_acc.damage = level[2];
        metadata_acc.mana = level[3];
        metadata_acc.mp_regen = level[4];
        metadata_acc.atk_speed = level[5];

        Ok(())
    }
}
