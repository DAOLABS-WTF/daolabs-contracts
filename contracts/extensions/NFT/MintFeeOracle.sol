// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

import '../../abstract/JBOperatable.sol';
import '../../interfaces/IJBDirectory.sol';
import '../../libraries/JBOperations.sol';

import './interfaces/IMintFeeOracle.sol';

contract MintFeeOracle is IMintFeeOracle, JBOperatable {
  error FeeRateTooHigh(uint256 feeRate);

  uint256 constant PLATFORM_PROJECT_ID = 1;
  uint256 constant MAX_FEE_RATE = 1000; // 10%

  IJBDirectory public immutable jbxDirectory;
  IERC721 public immutable jbxProjects;
  /**
   * @notice The default fee rate, bps.
   */
  uint256 public defaultFeeRate;
  /**
   * @notice Minimum fee, wei.
   */
  uint256 public minimumFee;
  mapping(uint256 => uint256) public projectFeeRates;

  constructor(
    IJBOperatorStore _jbxOperatorStore,
    IJBDirectory _jbxDirectory,
    IERC721 _jbxProjects,
    uint256 _defaultFeeRate,
    uint256 _minimumFee
  ) {
    operatorStore = _jbxOperatorStore; // JBOperatable

    jbxDirectory = _jbxDirectory;
    jbxProjects = _jbxProjects;

    if (_defaultFeeRate > MAX_FEE_RATE) {
      revert FeeRateTooHigh(MAX_FEE_RATE);
    }

    defaultFeeRate = _defaultFeeRate;
    minimumFee = _minimumFee;
  }

  //*********************************************************************//
  // ------------------------ external functions ----------------------- //
  //*********************************************************************//

  receive() external payable {}

  /**
   * @notice Returns a fee for a given price and project id. This is used by BaseNFT to calculate the platform fee for minting a token.
   */
  function fee(uint256 _projectId, uint256 _price) external view returns (uint256) {
    if (_price == 0) {
      return minimumFee;
    }

    return
      ((projectFeeRates[_projectId] == 0 ? defaultFeeRate : projectFeeRates[_projectId]) * _price) /
      10_000;
  }

  /**
   * @notice Set the fee rate for a project. Contract-level minimumFee is applied if price is 0. Setting a project fee to 0 will apply defaultFeeRate. This is a priviledged operation requiring the MANAGE_PAYMENTS permission on the platform project.
   *
   * @param _feeRate Fee rate expressed in bps.
   * @param _projectId Project id. Pass 0 to set defaultFeeRate.
   */
  function setFeeRate(
    uint256 _feeRate,
    uint256 _projectId
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(PLATFORM_PROJECT_ID),
      PLATFORM_PROJECT_ID,
      JBOperations.MANAGE_PAYMENTS,
      (msg.sender == address(jbxDirectory.controllerOf(PLATFORM_PROJECT_ID)))
    )
  {
    if (_feeRate > MAX_FEE_RATE) {
      revert FeeRateTooHigh(MAX_FEE_RATE);
    }

    if (_projectId == 0) {
      defaultFeeRate = _feeRate;
    } else {
      projectFeeRates[_projectId] = _feeRate;
    }
  }

  function transferBalance(
    address payable destination
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(PLATFORM_PROJECT_ID),
      PLATFORM_PROJECT_ID,
      JBOperations.MANAGE_PAYMENTS,
      (msg.sender == address(jbxDirectory.controllerOf(PLATFORM_PROJECT_ID)))
    )
  {
    destination.transfer(address(this).balance);
  }
}

// consider using fee-less concept that already exists in the protocol
