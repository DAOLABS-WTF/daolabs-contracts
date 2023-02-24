// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import '../../contracts/JBERC20PaymentTerminal3_1.sol';



contract MockMaliciousTerminal is JBERC20PaymentTerminal3_1 {
  error NopeNotGonnaDoIt();

  uint256 revertMode;

  //*********************************************************************//
  // -------------------------- constructor ---------------------------- //
  //*********************************************************************//

  /**
    @param _token The token that this terminal manages.
    @param _currency The currency that this terminal's token adheres to for price feeds.
    @param _baseWeightCurrency The currency to base token issuance on.
    @param _payoutSplitsGroup The group that denotes payout splits from this terminal in the splits store.
    @param _operatorStore A contract storing operator assignments.
    @param _projects A contract which mints ERC-721's that represent project ownership and transfers.
    @param _directory A contract storing directories of terminals and controllers for each project.
    @param _splitsStore A contract that stores splits for each project.
    @param _prices A contract that exposes price feeds.
    @param _store A contract that stores the terminal's data.
    @param _owner The address that will own this contract.
  */
  constructor(
    IERC20Metadata _token,
    uint256 _currency,
    uint256 _baseWeightCurrency,
    uint256 _payoutSplitsGroup,
    IJBOperatorStore _operatorStore,
    IJBProjects _projects,
    IJBDirectory _directory,
    IJBSplitsStore _splitsStore,
    IJBPrices _prices,
    IJBSingleTokenPaymentTerminalStore _store,
    address _owner
  )
    JBERC20PaymentTerminal3_1(
      _token,
      _currency,
      _baseWeightCurrency,
      _payoutSplitsGroup,
      _operatorStore,
      _projects,
      _directory,
      _splitsStore,
      _prices,
      _store,
      _owner
    )
  // solhint-disable-next-line no-empty-blocks
  {

  }

  function pay(
    uint256 _projectId,
    uint256 _amount,
    address _token,
    address _beneficiary,
    uint256 _minReturnedTokens,
    bool _preferClaimedTokens,
    string calldata _memo,
    bytes calldata _metadata
  ) external payable override returns (uint256) {
      _projectId;
      _amount;
      _token;
      _beneficiary;
      _minReturnedTokens;
      _preferClaimedTokens;
      _memo;
      _metadata;

      if(revertMode == 0)
        revert();
      else if(revertMode == 1)
        revert NopeNotGonnaDoIt();
      else if(revertMode == 2)
        require(false, "thanks no thanks");
      else {
        uint256 a = 3;
        uint256 b = 6;
        uint256 c = a - b;
        c;
      }
  }

  function addToBalanceOf(
    uint256 _projectId,
    uint256 _amount,
    address _token,
    string calldata _memo,
    bytes calldata _metadata
  ) external payable override {
      _projectId;
      _amount;
      _token;
      _memo;
      _metadata;

      if(revertMode == 0)
        revert();
      else if(revertMode == 1)
        revert NopeNotGonnaDoIt();
      else if(revertMode == 2)
        require(false, "thanks no thanks");
      else {
        uint256 a = 3;
        uint256 b = 6;
        uint256 c = a - b;
        c;
      }
  }

  function setRevertMode(uint256 _newMode) external {
    revertMode = _newMode;
  }
  
}
