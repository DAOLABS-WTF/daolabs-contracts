// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

import '../../abstract/JBOperatable.sol';
import '../../libraries/JBOperations.sol';
import '../../interfaces/IJBDirectory.sol';
import '../../interfaces/IJBProjects.sol';
import '../../interfaces/IJBOperatorStore.sol';
import './Factories/NFTokenFactory.sol';

/**
 * @notice
 */
/// @custom:oz-upgrades-unsafe-allow external-library-linking
contract Deployer_v001 is JBOperatable, OwnableUpgradeable, UUPSUpgradeable {
  event Deployment(string contractType, address contractAddress);

  IJBDirectory internal jbxDirectory;
  IJBProjects internal jbxProjects;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _jbxDirectory,
    address _jbxProjects,
    address _jbxOperatorStore
  ) public virtual initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();

    operatorStore = IJBOperatorStore(_jbxOperatorStore);
    jbxDirectory = IJBDirectory(_jbxDirectory);
    jbxProjects = IJBProjects(_jbxProjects);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  /**
   * @dev This creates a token that can be minted immediately, to discourage this, unitPrice can be set high, then mint period can be defined before setting price to a "reasonable" value.
   */
  function deployNFToken(
    address payable _owner,
    string memory _name,
    string memory _symbol,
    string memory _baseUri,
    string memory _contractUri,
    uint256 _maxSupply,
    uint256 _unitPrice,
    uint256 _mintAllowance,
    bool _reveal
  ) external returns (address token) {
    token = NFTokenFactory.createNFToken(
      _owner,
      _name,
      _symbol,
      _baseUri,
      _contractUri,
      _maxSupply,
      _unitPrice,
      _mintAllowance,
      _reveal
    );
    emit Deployment('NFToken', token);
  }
}
