// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

import '../../libraries/JBTokens.sol';
import '../../interfaces/IJBFundingCycleDataSource.sol';
import '../../interfaces/IJBPayDelegate.sol';
import '../../interfaces/IJBPaymentTerminal.sol';
import '../../interfaces/IJBRedemptionDelegate.sol';
import '../../structs/JBTokenAmount.sol';
import '../../structs/JBDidPayData.sol';
import '../../structs/JBDidRedeemData.sol';
import '../../structs/JBPayParamsData.sol';
import '../../structs/JBRedeemParamsData.sol';

import '../NFT/components/BaseMembership.sol';

contract MembershipNFTDataSourceDelegate is
  IERC165,
  IJBFundingCycleDataSource,
  IJBPayDelegate,
  IJBRedemptionDelegate
{
  enum EventType {
    STANDARD,
    ACTIVE_MEMBER
  }

  event ContributionRecorded(address indexed contributor, uint256 amount, EventType eventType);

  event RedemptionRecorded(address indexed contributor, uint256 amount, EventType eventType);

  BaseMembership public membershipNFT;
  address public contributionToken;
  uint256 public minContribution;
  IJBPaymentTerminal public terminal;
  uint256 public projectId;
  mapping(address => uint256) public memberContributions;
  mapping(address => uint256) public nonmemberContributions;

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
    view
    override
    returns (
      uint256 reclaimAmount,
      string memory memo,
      JBRedemptionDelegateAllocation[] memory delegateAllocations
    )
  {
    uint256 memberContribution = memberContributions[_data.holder];
    uint256 nonmemberContribution = nonmemberContributions[_data.holder];
    uint256 contributionTotal = nonmemberContribution + memberContribution;

    reclaimAmount = contributionTotal <= _data.reclaimAmount.value
      ? contributionTotal
      : _data.reclaimAmount.value;

    memo = _data.memo;

    delegateAllocations = new JBRedemptionDelegateAllocation[](1);
    delegateAllocations[0] = JBRedemptionDelegateAllocation({
      delegate: this,
      amount: reclaimAmount
    });
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
  function didPay(JBDidPayData calldata _data) external payable override nonReentrant {
    if (
      _data.forwardedAmount.token == contributionToken &&
      _data.forwardedAmount.value >= minContribution
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
    }

    if (membershipNFT.balanceOf(_data.beneficiary) == 0) {
      membershipNFT.mintFor(_data.beneficiary);
    }

    // TODO: note the difference between amount and forwardedAmount
    bool activeMemebership = hasActiveMembership(_data.payer);
    if (activeMemebership) {
      memberContributions[_data.beneficiary] += _data.amount.value;
    } else {
      nonmemberContributions[_data.beneficiary] += _data.amount.value;
    }

    emit ContributionRecorded(
      _data.beneficiary,
      _data.amount.value,
      (activeMemebership ? EventType.ACTIVE_MEMBER : EventType.STANDARD)
    );
  }

  //*********************************************************************//
  // -------------------- IJBRedemptionDelegate ------------------------ //
  //*********************************************************************//

  /**
   * @notice IJBRedemptionDelegate implementation.
   */
  function didRedeem(JBDidRedeemData calldata _data) external payable override nonReentrant {
    bool activeMemebership = hasActiveMembership(_data.holder);

    uint256 memberContribution = memberContributions[_data.holder];
    uint256 nonmemberContribution = nonmemberContributions[_data.holder];
    uint256 contributionTotal = nonmemberContribution + memberContribution;
    uint256 extractableAmount;

    extractableAmount = contributionTotal <= _data.reclaimedAmount.value
      ? contributionTotal
      : _data.reclaimedAmount.value;

    if (memberContribution >= extractableAmount) {
      memberContributions[_data.holder] -= extractableAmount;
    } else {
      memberContributions[_data.holder] = 0;
      nonmemberContributions[_data.holder] -= extractableAmount - memberContribution;
    }

    _data.beneficiary.transfer(extractableAmount);

    emit RedemptionRecorded(
      _data.holder,
      extractableAmount,
      (activeMemebership ? EventType.ACTIVE_MEMBER : EventType.STANDARD)
    );
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

  function hasActiveMembership(address _account) public view returns (bool) {
    uint256 accountBalance = membershipNFT.balanceOf(_account);
    if (accountBalance == 0) {
      return false;
    }

    uint256 tokenId;
    for (uint256 i; i < accountBalance; ) {
      tokenId = membershipNFT.tokenOfOwnerByIndex(_account, i);
      if (membershipNFT.isActive(tokenId)) {
        return true;
      }

      unchecked {
        ++i;
      }
    }
  }
}
