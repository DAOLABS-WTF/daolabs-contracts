// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './Deployer_v001.sol';
import './MixedPaymentSplitterFactory.sol';

/**
 * @notice
 */
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Deployer_v002 is Deployer_v001 {
  function deployMixedPaymentSplitter(
    string memory _name,
    address[] memory _payees,
    uint256[] memory _projects,
    uint256[] memory _shares,
    IJBDirectory _jbxDirectory,
    address _owner
  ) external returns (address) {
    address s = MixedPaymentSplitterFactory.createMixedPaymentSplitter(
      _name,
      _payees,
      _projects,
      _shares,
      _jbxDirectory,
      _owner
    );

    emit Deployment('MixedPaymentSplitter', s);

    return s;
  }
}
