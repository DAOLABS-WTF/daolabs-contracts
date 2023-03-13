// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import '../abstract/JBOperatable.sol';
import '../interfaces/IJBDirectory.sol';
import '../interfaces/IJBFundingCycleDataSource.sol';
import '../interfaces/IJBProjects.sol';
import '../libraries/JBOperations.sol';

/**
 * @notice DatasourceProxy allows an account with the PROCESS_FEES permission on a given project to register a collection of IJBFundingCycleDataSource which would then be called by the terminal in the order specified in this list as IJBPayDelegate or IJBRedemptionDelegate.
 */
contract DatasourceProxy is JBOperatable, IJBFundingCycleDataSource {
  error INVALID_DELEGATE();

  //*********************************************************************//
  // --------------------- private stored properties ------------------- //
  //*********************************************************************//

  IJBDirectory public jbxDirectory;
  IJBProjects public jbxProjects;
  uint256 public projectId;

  IJBFundingCycleDataSource[] public delegates;

  constructor(
    IJBDirectory _jbxDirectory,
    IJBProjects _jbxProjects,
    IJBOperatorStore _jbxOperatorStore,
    uint256 _projectId,
    IJBFundingCycleDataSource[] memory _delegates
  )
    requirePermissionAllowingOverride(
      _jbxProjects.ownerOf(_projectId),
      _projectId,
      JBOperations.PROCESS_FEES,
      (msg.sender == address(_jbxDirectory.controllerOf(_projectId)))
    )
  {
    operatorStore = _jbxOperatorStore; // JBOperatable

    jbxDirectory = _jbxDirectory;
    jbxProjects = _jbxProjects;

    projectId = _projectId;

    for (uint256 i; i != _delegates.length; ) {
      delegates.push(_delegates[i]);
      unchecked {
        ++i;
      }
    }
  }

  //*********************************************************************//
  // ---------------------- external functions ------------------------- //
  //*********************************************************************//

  /**
   * Register a delegate.
   *
   * @param _delegate Datasource delegate to add.
   * @param _order Index at which it should be added.
   */
  function registerDelegate(
    IJBFundingCycleDataSource _delegate,
    uint256 _order
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(projectId),
      projectId,
      JBOperations.PROCESS_FEES,
      (msg.sender == address(jbxDirectory.controllerOf(projectId)))
    )
  {
    uint256 delegateCount = delegates.length;
    uint256 updatedDelegateCount = delegateCount + 1;
    IJBFundingCycleDataSource[] memory updatedDelegates = new IJBFundingCycleDataSource[](
      updatedDelegateCount
    );

    if (_order > updatedDelegateCount) {
      _order = updatedDelegateCount - 1;
    }

    if (updatedDelegateCount == 1) {
      updatedDelegates[0] = _delegate;
    } else {
      for (uint256 i; i != updatedDelegateCount; ) {
        if (i == _order) {
          updatedDelegates[i] = _delegate;
        } else if (i < _order) {
          updatedDelegates[i] = delegates[i];
        } else {
          updatedDelegates[i] = delegates[i - 1];
        }

        unchecked {
          ++i;
        }
      }
    }

    delegates = updatedDelegates;

    // emit
  }

  /**
   * Remove a delegate. If an address is missing, it will revert.
   *
   * @param _delegate Datasource delegate to remove.
   */
  function removeDelegate(
    IJBFundingCycleDataSource _delegate
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(projectId),
      projectId,
      JBOperations.PROCESS_FEES,
      (msg.sender == address(jbxDirectory.controllerOf(projectId)))
    )
  {
    uint256 delegateCount = delegates.length;
    IJBFundingCycleDataSource[] memory updatedDelegates = new IJBFundingCycleDataSource[](
      delegateCount - 1
    );

    bool found;
    for (uint256 i; i != delegateCount; ) {
      if (delegates[i] == _delegate) {
        found = true;
      } else if (i == delegateCount - 1 && !found) {
        revert INVALID_DELEGATE();
      } else {
        updatedDelegates[!found ? i : i - 1] = delegates[i];
      }

      unchecked {
        ++i;
      }
    }

    delegates = updatedDelegates;

    // emit
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
    uint256 delegateCount = delegates.length;

    for (uint256 i; i != delegateCount; ) {
      (
        uint256 interimWeight,
        string memory interimMemo,
        JBPayDelegateAllocation[] memory interimAllocations
      ) = IJBFundingCycleDataSource(delegates[i]).payParams(_data);

      weight += interimWeight;
      delegateAllocations[i] = interimAllocations[0];

      unchecked {
        ++i;
      }
    }
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
    uint256 delegateCount = delegates.length;

    for (uint256 i; i != delegateCount; ) {
      (
        uint256 interimReclaimAmount,
        string memory interimMemo,
        JBRedemptionDelegateAllocation[] memory interimAllocations
      ) = IJBFundingCycleDataSource(delegates[i]).redeemParams(_data);

      reclaimAmount += interimReclaimAmount;
      delegateAllocations[i] = interimAllocations[0];

      unchecked {
        ++i;
      }
    }
  }

  /**
   * @notice IERC165 implementation
   */
  function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
    return interfaceId == type(IJBFundingCycleDataSource).interfaceId;
  }
}
