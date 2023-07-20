use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token::{MintTo, Token};
use std::mem::size_of;

declare_id!("H3nF7bwSU5h28m4M28i98aGfiqHy3pReESu8Frii6GzY");

#[program]
mod upgrade_weapon_gold {
    use anchor_lang::system_program;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, symbol: String) -> ProgramResult {
        msg!("Initializing upgrade weapon program");
        let upgrade_weapon_gold = &mut ctx.accounts.upgrade_weapon_gold;
        upgrade_weapon_gold.name = name;
        upgrade_weapon_gold.symbol = symbol;
        Ok(())
    }

    // Define account structures

    #[account]
    pub struct UpgradeWeapon {
        pub name: String,
        pub symbol: String,
    }

    pub fn mint(ctx: Context<MintToken>, amount: u64) -> ProgramResult {
        msg!("Creating token account");

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

        msg!("Token account created successfully");

        msg!("Initialize mint");

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

        msg!("Associated token account created successfully");

        // Create the MintTo struct for our context
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the CpiContext we need for the request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute anchor's helper function to mint tokens
        anchor_spl::token::mint_to(cpi_ctx, amount)?;

        msg!("Token mint process successfully.");

        Ok(())
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
        pub authority: Signer<'info>,

        pub system_program: Program<'info, System>,
        pub token_program: Program<'info, Token>,
        pub rent: Sysvar<'info, Rent>,
        pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    }

    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> ProgramResult {
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

        anchor_spl::token::transfer(cpi_ctx, amount)?;

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
        pub upgrade_weapon_gold: Box<Account<'info, UpgradeWeapon>>,
        #[account(mut)]
        /// CHECK: No checks through types are necessary for the `user` account.
        pub user: Signer<'info>,
        pub system_program: Program<'info, System>,
    }

    pub fn burn(ctx: Context<Burn>, amount: u64) -> ProgramResult {
        let cpi_ctx: CpiContext<'_, '_, '_, '_, anchor_spl::token::Burn<'_>> = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Burn {
                from: ctx.accounts.association_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );

        anchor_spl::token::burn(cpi_ctx, amount)?;

        Ok(())
    }

    #[derive(Accounts)]
    #[instruction(amount: u64)]
    pub struct Burn<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(mut)]
        pub mint: Account<'info, anchor_spl::token::Mint>,

        #[account(mut)]
        pub association_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    
        pub token_program: Program<'info, Token>,
    }
}
