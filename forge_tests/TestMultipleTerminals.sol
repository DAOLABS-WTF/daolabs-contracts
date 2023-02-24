// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@paulrberg/contracts/math/PRBMath.sol";
import "./helpers/TestBaseWorkflow.sol";
import "./mock/MockPriceFeed.sol";
import "@paulrberg/contracts/math/PRBMath.sol";

contract TestMultipleTerminals_Local is TestBaseWorkflow {
    JBController controller;
    JBProjectMetadata _projectMetadata;
    JBFundingCycleData _data;
    JBFundingCycleMetadata _metadata;
    JBGroupedSplits[] _groupedSplits;
    JBFundAccessConstraints[] _fundAccessConstraints;

    IJBPaymentTerminal[] _terminals;
    JBERC20PaymentTerminal ERC20terminal;
    JBETHPaymentTerminal ETHterminal;

    JBTokenStore _tokenStore;
    address _projectOwner;

    address caller = address(6942069);

    uint256 FAKE_PRICE = 10;
    uint256 WEIGHT = 1000 * 10 ** 18;
    uint256 projectId;

    function setUp() public override {
        super.setUp();
        vm.label(caller, "caller");

        _groupedSplits.push();
        _groupedSplits[0].group = 1;
        _groupedSplits[0].splits.push(
            JBSplit({
                preferClaimed: false,
                preferAddToBalance: false,
                percent: jbLibraries().SPLITS_TOTAL_PERCENT(),
                projectId: 0,
                beneficiary: payable(caller),
                lockedUntil: 0,
                allocator: IJBSplitAllocator(address(0))
            })
        );

        _projectOwner = multisig();

        _tokenStore = jbTokenStore();

        controller = jbController();

        _projectMetadata = JBProjectMetadata({content: "myIPFSHash", domain: 1});

        _data = JBFundingCycleData({
            duration: 14,
            weight: WEIGHT,
            discountRate: 450_000_000, // out of 1_000_000_000
            ballot: IJBFundingCycleBallot(address(0))
        });

        _metadata = JBFundingCycleMetadata({
            global: JBGlobalFundingCycleMetadata({
                allowSetTerminals: false,
                allowSetController: false,
                pauseTransfers: false
            }),
            reservedRate: 5000, //50%
            redemptionRate: 10000, //100%
            ballotRedemptionRate: 0,
            pausePay: false,
            pauseDistributions: false,
            pauseRedeem: false,
            pauseBurn: false,
            allowMinting: false,
            allowTerminalMigration: false,
            allowControllerMigration: false,
            holdFees: false,
            preferClaimedTokenOverride: false,
            useTotalOverflowForRedemptions: true,
            useDataSourceForPay: false,
            useDataSourceForRedeem: false,
            dataSource: address(0),
            metadata: 0
        });

        if (isUsingJbController3_0()) {
            ERC20terminal = new JBERC20PaymentTerminal(
                jbToken(),
                jbLibraries().USD(), // currency
                jbLibraries().ETH(), // base weight currency
                1, // JBSplitsGroupe
                jbOperatorStore(),
                jbProjects(),
                jbDirectory(),
                jbSplitsStore(),
                jbPrices(),
                jbPaymentTerminalStore(),
                multisig()
            );
        }else{
            ERC20terminal = JBERC20PaymentTerminal(address(new JBERC20PaymentTerminal3_1(
                jbToken(),
                jbLibraries().USD(), // currency
                jbLibraries().ETH(), // base weight currency
                1, // JBSplitsGroupe
                jbOperatorStore(),
                jbProjects(),
                jbDirectory(),
                jbSplitsStore(),
                jbPrices(),
                jbPaymentTerminalStore(),
                multisig()
            )));
        }
        
        vm.label(address(ERC20terminal), "JBERC20PaymentTerminalUSD");

        ETHterminal = jbETHPaymentTerminal();

        _fundAccessConstraints.push(
            JBFundAccessConstraints({
                terminal: ERC20terminal,
                token: address(jbToken()),
                distributionLimit: 10 * 10 ** 18,
                overflowAllowance: 5 * 10 ** 18,
                distributionLimitCurrency: jbLibraries().USD(),
                overflowAllowanceCurrency: jbLibraries().USD()
            })
        );

        _fundAccessConstraints.push(
            JBFundAccessConstraints({
                terminal: ETHterminal,
                token: jbLibraries().ETHToken(),
                distributionLimit: 10 * 10 ** 18,
                overflowAllowance: 5 * 10 ** 18,
                distributionLimitCurrency: jbLibraries().ETH(),
                overflowAllowanceCurrency: jbLibraries().ETH()
            })
        );

        _terminals.push(ERC20terminal);
        _terminals.push(ETHterminal);

        projectId = controller.launchProjectFor(
            _projectOwner,
            _projectMetadata,
            _data,
            _metadata,
            block.timestamp,
            _groupedSplits,
            _fundAccessConstraints,
            _terminals,
            ""
        );

        vm.startPrank(_projectOwner);
        MockPriceFeed _priceFeed = new MockPriceFeed(FAKE_PRICE);
        MockPriceFeed _priceFeedUsdEth = new MockPriceFeed(FAKE_PRICE);
        vm.label(address(_priceFeed), "MockPrice Feed");

        jbPrices().addFeedFor(
            jbLibraries().USD(), // currency
            jbLibraries().ETH(), // base weight currency
            _priceFeedUsdEth
        );

        vm.stopPrank();
    }

    function testMultipleTerminal() public {
        // Send some token to the caller, so he can play
        vm.prank(_projectOwner);
        jbToken().transfer(caller, 20 * 10 ** 18);

        // ---- Pay in token ----
        vm.prank(caller); // back to regular msg.sender (bug?)
        jbToken().approve(address(ERC20terminal), 20 * 10 ** 18);
        vm.prank(caller); // back to regular msg.sender (bug?)
        ERC20terminal.pay(projectId, 20 * 10 ** 18, address(0), caller, 0, false, "Forge test", new bytes(0));

        // verify: beneficiary should have a balance of JBTokens (divided by 2 -> reserved rate = 50%)
        // price feed will return FAKE_PRICE*18 (for curr usd/base eth); since it's an 18 decimal terminal (ie calling getPrice(18) )
        uint256 _userTokenBalance = PRBMath.mulDiv(20 * 10 ** 18, WEIGHT, 36 * FAKE_PRICE);
        assertEq(_tokenStore.balanceOf(caller, projectId), _userTokenBalance);

        // verify: balance in terminal should be up to date
        assertEq(jbPaymentTerminalStore().balanceOf(ERC20terminal, projectId), 20 * 10 ** 18);

        // ---- Pay in ETH ----
        address beneficiaryTwo = address(696969);
        ETHterminal.pay{value: 20 ether}(
            projectId, 20 ether, address(0), beneficiaryTwo, 0, false, "Forge test", new bytes(0)
        ); // funding target met and 10 ETH are now in the overflow

        // verify: beneficiary should have a balance of JBTokens (divided by 2 -> reserved rate = 50%)
        uint256 _userEthBalance = PRBMath.mulDiv(20 ether, (WEIGHT / 10 ** 18), 2);
        assertEq(_tokenStore.balanceOf(beneficiaryTwo, projectId), _userEthBalance);

        // verify: ETH balance in terminal should be up to date
        assertEq(jbPaymentTerminalStore().balanceOf(ETHterminal, projectId), 20 ether);

        // ---- Use allowance ----
        vm.startPrank(_projectOwner);
        if (isUsingJbController3_0())
            ERC20terminal.useAllowanceOf(
                projectId,
                5 * 10 ** 18, // amt in ETH (overflow allowance currency is in ETH)
                jbLibraries().USD(), // Currency -> (fake price is 10)
                address(0), //token (unused)
                1, // Min wei out
                payable(msg.sender), // Beneficiary
                "MEMO"
            );
        else 
            IJBPayoutRedemptionPaymentTerminal3_1(address(ERC20terminal)).useAllowanceOf(
                projectId,
                5 * 10 ** 18, // amt in ETH (overflow allowance currency is in ETH)
                jbLibraries().USD(), // Currency -> (fake price is 10)
                address(0), //token (unused)
                1, // Min wei out
                payable(msg.sender), // Beneficiary
                "MEMO",
                bytes('')
            );
        
        vm.stopPrank();

        // Funds leaving the contract -> take the fee
        assertEq(
            jbToken().balanceOf(msg.sender),
            PRBMath.mulDiv(5 * 10 ** 18, jbLibraries().MAX_FEE(), jbLibraries().MAX_FEE() + ERC20terminal.fee())
        );

        // Distribute the funding target ETH
        uint256 initBalance = caller.balance;
        vm.prank(_projectOwner);
        if (isUsingJbController3_0())
            ETHterminal.distributePayoutsOf(
                projectId,
                10 * 10 ** 18,
                jbLibraries().ETH(), // Currency
                address(0), //token (unused)
                0, // Min wei out
                "Foundry payment" // Memo
            );
        else 
            IJBPayoutRedemptionPaymentTerminal3_1(address(ETHterminal)).distributePayoutsOf(
                projectId,
                10 * 10 ** 18,
                jbLibraries().ETH(), // Currency
                address(0), //token (unused)
                0, // Min wei out
                "" // Memo
            );
        
        // Funds leaving the ecosystem -> fee taken
        assertEq(
            caller.balance,
            initBalance
                + PRBMath.mulDiv(10 * 10 ** 18, jbLibraries().MAX_FEE(), ETHterminal.fee() + jbLibraries().MAX_FEE())
        );

        // redeem eth from the overflow by the token holder:
        uint256 totalSupply;
        if (isUsingJbController3_0()) {
            totalSupply = jbController().totalOutstandingTokensOf(projectId, 5000);
        } else {
            totalSupply = IJBController3_1(address(jbController())).totalOutstandingTokensOf(projectId);
        }

        uint256 overflow = jbPaymentTerminalStore().currentTotalOverflowOf(projectId, 18, 1);

        uint256 callerEthBalanceBefore = caller.balance;

        vm.prank(caller);
        ETHterminal.redeemTokensOf(
            caller,
            projectId,
            100_000,
            address(0), //token (unused)
            0,
            payable(caller),
            "gimme my money back",
            new bytes(0)
        );

        assertEq(caller.balance, callerEthBalanceBefore + ((100_000 * overflow) / totalSupply));
    }
}
