// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import '../interfaces/IJBFundingCycleDataSource.sol';
import '../interfaces/IJBPayDelegate.sol';
import '../interfaces/IJBRedemptionDelegate.sol';

import '../structs/JBDidPayData.sol';
import '../structs/JBDidRedeemData.sol';
import '../structs/JBPayParamsData.sol';
import '../structs/JBRedeemParamsData.sol';
import '../structs/JBTokenAmount.sol';

import './NFT/components/BaseMembership.sol';

contract RevenueDatasource is
  IJBFundingCycleDataSource,
  IJBPayDelegate,
  IJBRedemptionDelegate,
  ReentrancyGuard
{
  enum EventType {
    STANDARD,
    ACTIVE_MEMBER
  }

  event ContributionRecorded(address indexed contributor, uint256 amount);

  event RedemptionRecorded(address indexed contributor, uint256 amount, EventType eventType);

  mapping(address => uint256) public contributions;

  BaseMembership public immutable membershipNft;

  // track user contribution amounts (in a datasource delegate, allow mapping update), prevent non-active membership holders from redeeming more than they contribute

  constructor(BaseMembership _membershipNft) {
    membershipNft = _membershipNft;
  }

  /**
   * @notice IJBFundingCycleDataSource implementation
   *
   * @dev This function will call payParams on all the stored delegates and keep the first result of each to be returned in the delegateAllocations array. Similarly, weight is the sum of the values returned by those calls.
   */
  function payParams(
    JBPayParamsData calldata _data
  )
    public
    override
    returns (
      uint256 weight,
      string memory memo,
      JBPayDelegateAllocation[] memory delegateAllocations
    )
  {
    //
  }

  /**
   * @notice IJBFundingCycleDataSource implementation
   *
   * @dev This function will call redeemParams on all the stored delegates and keep the first result of each to be returned in the delegateAllocations array. Similarly, reclaimAmount is the sum of the values returned by those calls.
   */
  function redeemParams(
    JBRedeemParamsData calldata _data
  )
    public
    override
    returns (
      uint256 reclaimAmount,
      string memory memo,
      JBRedemptionDelegateAllocation[] memory delegateAllocations
    )
  {
    bool activeMemebership = hasActiveMembership(_data.holder);

    if (activeMemebership) {
      reclaimAmount = _data.reclaimAmount.value;
    } else {
      uint256 contributionTotal = contributions[_data.holder];
      reclaimAmount = contributionTotal <= _data.reclaimAmount.value
        ? contributionTotal
        : _data.reclaimAmount.value;
    }

    memo = _data.memo;
    delegateAllocations = new JBRedemptionDelegateAllocation[](0);
    delegateAllocations[0] = JBRedemptionDelegateAllocation({
      delegate: this,
      amount: reclaimAmount
    });
  }

  /**
   * @notice IJBPayDelegate implementation
   */
  function didPay(JBDidPayData calldata _data) external payable override nonReentrant {
    contributions[_data.beneficiary] += _data.amount.value;

    emit ContributionRecorded(_data.beneficiary, _data.amount.value);
  }

  /**
   * @notice IJBRedemptionDelegate implementation
   */
  function didRedeem(JBDidRedeemData calldata _data) external payable override nonReentrant {
    bool activeMemebership = hasActiveMembership(_data.holder);

    uint256 contributionTotal = contributions[_data.holder];
    uint256 extractableAmount;
    if (activeMemebership) {
      extractableAmount = _data.forwardedAmount.value;
    } else {
      extractableAmount = contributionTotal <= _data.forwardedAmount.value
        ? contributionTotal
        : _data.forwardedAmount.value;
    }

    contributions[_data.holder] -= extractableAmount;
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

  function supportsInterface(bytes4 _interfaceId) public view override(IERC165) returns (bool) {
    return
      _interfaceId == type(IJBFundingCycleDataSource).interfaceId ||
      _interfaceId == type(IJBPayDelegate).interfaceId ||
      _interfaceId == type(IJBRedemptionDelegate).interfaceId;
  }

  function hasActiveMembership(address _account) public view returns (bool) {
    uint256 accountBalance = membershipNft.balanceOf(_account);
    if (accountBalance == 0) {
      return false;
    }

    uint256 tokenId;
    for (uint256 i; i < accountBalance; ) {
      tokenId = membershipNft.tokenOfOwnerByIndex(_account, i);
      if (membershipNft.isActive(tokenId)) {
        return true;
      }

      unchecked {
        ++i;
      }
    }
  }
}
