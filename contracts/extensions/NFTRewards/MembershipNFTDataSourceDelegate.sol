// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

import '../../libraries/JBTokens.sol';
import '../../interfaces/IJBFundingCycleDataSource.sol';
import '../../interfaces/IJBPayDelegate.sol';
import '../../interfaces/IJBPaymentTerminal.sol';
import '../../interfaces/IJBRedemptionDelegate.sol';
import '../../structs/JBDidPayData.sol';
import '../../structs/JBDidRedeemData.sol';
import '../../structs/JBRedeemParamsData.sol';
import '../NFT/components/BaseMembership.sol';

contract MembershipNFTDataSourceDelegate is
  IERC165,
  IJBFundingCycleDataSource,
  IJBPayDelegate,
  IJBRedemptionDelegate
{
  BaseMembership public membershipNFT;
  address public contributionToken;
  uint256 public minContribution;
  IJBPaymentTerminal public terminal;
  uint256 public projectId;

  /**
   * @notice This is a sample contract to demonstrate issuance of a membership NFT for a project contribution.
   *
   * @dev This contract implements IJBFundingCycleDataSource, IJBPayDelegate, and IJBRedemptionDelegate. It will issue an NFT if the incoming contribution meets the minimum and is denominated in the expected token as passed to the constructor.
   *
   * @dev This contract requires the MINTER_ROLE permission on the NFT associated with it, see BaseMembership contract for more details.
   *
   * @param _membershipNFT Membership nft to mint on contribution if meeting minimums.
   * @param _contributionToken Contribution token to accept.
   * @param _minContribution Minimum contribution amount that will result in NFT mint.
   * @param _terminal Payment terminal to forward payments to.
   * @param _projectId Project ID to for payments.
   */
  constructor(
    BaseMembership _membershipNFT,
    address _contributionToken,
    uint256 _minContribution,
    IJBPaymentTerminal _terminal,
    uint256 _projectId
  ) {
    membershipNFT = _membershipNFT;
    contributionToken = _contributionToken;
    minContribution = _minContribution;
    terminal = _terminal;
    projectId = _projectId;
  }

  //*********************************************************************//
  // ------------------- IJBFundingCycleDataSource --------------------- //
  //*********************************************************************//

  /**
   * @notice This delegate doesn't alter the number of project tokens to be minted, as such _data.weight is passed through. The allocations array will include a single record for this address and the amount of minContribution if the total incoming amount is at least as much, and zero otherwise since under that condition the NFT will not be minted. Additionally only one NFT per address will be minted. Once a contribution results in an NFT, subsequent ones, regarless of size, will not.
   */
  function payParams(
    JBPayParamsData calldata _data
  )
    external
    view
    override
    returns (
      uint256 weight,
      string memory memo,
      JBPayDelegateAllocation[] memory delegateAllocations
    )
  {
    weight = _data.weight;
    memo = _data.memo;

    delegateAllocations = new JBPayDelegateAllocation[](1);
    delegateAllocations[0] = JBPayDelegateAllocation({
      delegate: IJBPayDelegate(address(this)),
      amount: (_data.amount.token == contributionToken &&
        _data.amount.value >= minContribution &&
        membershipNFT.balanceOf(_data.beneficiary) == 0)
        ? minContribution
        : 0
    });
  }

  /**
   * @notice This implementation of IJBRedemptionDelegate doesn't support redemptions.
   *
   * @param _data Project redemption param.
   * @return reclaimAmount Zero, redemptions not supported by this delegate.
   * @return memo Pass-through value
   * @return delegateAllocations Empty list.
   */
  function redeemParams(
    JBRedeemParamsData calldata _data
  )
    external
    pure
    override
    returns (
      uint256 reclaimAmount,
      string memory memo,
      JBRedemptionDelegateAllocation[] memory delegateAllocations
    )
  {
    memo = _data.memo;
  }

  //*********************************************************************//
  // ------------------------ IJBPayDelegate --------------------------- //
  //*********************************************************************//

  /**
   * @notice Part of IJBPayDelegate, this function will mint an NFT to the contributor (_data.beneficiary) if conditions are met. Will take minContribution and send it to the predefined terminal, meaning _data.forwardedAmount.value must match minContribution.
   *
   * @dev
   *
   * @param _data Project contribution param.
   */
  function didPay(JBDidPayData calldata _data) external payable override {
    if (
      _data.forwardedAmount.token == contributionToken &&
      _data.forwardedAmount.value >= minContribution &&
      membershipNFT.balanceOf(_data.beneficiary) == 0
    ) {
      // TODO: test the need to approve token transfer
      uint256 payableValue = _data.forwardedAmount.token == JBTokens.ETH
        ? _data.forwardedAmount.value
        : 0;
      terminal.addToBalanceOf{value: payableValue}(
        projectId,
        _data.forwardedAmount.value,
        _data.forwardedAmount.token,
        _data.memo,
        _data.metadata
      );

      membershipNFT.mintFor(_data.beneficiary);
    }
  }

  //*********************************************************************//
  // -------------------- IJBRedemptionDelegate ------------------------ //
  //*********************************************************************//

  /**
   * @notice NFT redemption is not supported.
   */
  // solhint-disable-next-line
  function didRedeem(JBDidRedeemData calldata _data) external payable override {
    // not a supported workflow for NFTs
  }

  //*********************************************************************//
  // ---------------------------- IERC165 ------------------------------ //
  //*********************************************************************//

  function supportsInterface(bytes4 _interfaceId) public pure override(IERC165) returns (bool) {
    return
      _interfaceId == type(IJBFundingCycleDataSource).interfaceId ||
      _interfaceId == type(IJBPayDelegate).interfaceId ||
      _interfaceId == type(IJBRedemptionDelegate).interfaceId;
  }
}
