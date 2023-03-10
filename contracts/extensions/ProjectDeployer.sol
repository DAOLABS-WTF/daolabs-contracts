// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';
import '@paulrberg/contracts/math/PRBMath.sol';

import '../interfaces/IJBController.sol';
import '../interfaces/IJBOperatorStore.sol';
import '../interfaces/IJBPaymentTerminal.sol';
import '../interfaces/IJBProjects.sol';
import '../interfaces/IJBTokenStore.sol';

import '../libraries/JBConstants.sol';
import '../libraries/JBFundingCycleMetadataResolver.sol';
import '../libraries/JBOperations.sol';
import '../libraries/JBSplitsGroups.sol';

import './Deployer/Deployer_v007.sol';

contract ProjectDeployer {
  IJBController public jbxController;
  IJBTokenStore public jbxTokenStore;
  IJBDirectory public jbxDirectory;
  IJBProjects public jbxProjects;
  IJBOperatorStore public jbxOperatorStore;
  Deployer_v007 public deployer;

  constructor(
    IJBController _jbxController,
    IJBTokenStore _jbxTokenStore,
    IJBDirectory _jbxDirectory,
    IJBProjects _jbxProjects,
    IJBOperatorStore _jbxOperatorStore,
    Deployer_v007 _deployer
  ) {
    jbxController = _jbxController;
    jbxTokenStore = _jbxTokenStore;
    jbxDirectory = _jbxDirectory;
    jbxProjects = _jbxProjects;
    jbxOperatorStore = _jbxOperatorStore;
    deployer = _deployer;
  }

  function createProject(
    address payable _owner,
    JBProjectMetadata calldata _projectMetadata,
    JBFundingCycleData calldata _data,
    JBFundingCycleMetadata calldata _metadata,
    uint256 _mustStartAtOrAfter,
    JBGroupedSplits[] calldata _groupedSplits,
    JBFundAccessConstraints[] calldata _fundAccessConstraints,
    IJBPaymentTerminal[] memory _terminals,
    string memory _memo
  ) external returns (uint256 projectId, address payer) {
    projectId = jbxController.launchProjectFor(
      _owner,
      _projectMetadata,
      _data,
      _metadata,
      _mustStartAtOrAfter,
      _groupedSplits,
      _fundAccessConstraints,
      _terminals,
      _memo
    );

    payer = deployPayer(projectId, _owner, _memo);
  }

  function deployProjectToken(
    uint256 _projectId,
    string memory _tokenName,
    string memory _tokenSymbol
  ) external returns (address token) {
    token = address(jbxTokenStore.issueFor(_projectId, _tokenName, _tokenSymbol));
  }

  function deployPayer(
    uint256 _projectId,
    address payable _owner,
    string memory _memo
  ) internal returns (address payer) {
    payer = deployer.deployProjectPayer(
      jbxDirectory,
      jbxOperatorStore,
      jbxProjects,
      _projectId,
      _owner,
      true,
      false,
      _memo,
      '0x00'
    );
  }
}
