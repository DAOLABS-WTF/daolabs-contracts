// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

import '../../abstract/JBOperatable.sol';
import '../../interfaces/IJBDirectory.sol';
import '../../libraries/JBOperations.sol';

interface IMintFor is IERC721 {
  function mintFor(address) external returns (uint256);
}

contract MintFurnace is JBOperatable {
  error TOKEN_UNSUPPORTED();
  error INSUFFICIENT_TOKENS();
  error TRANSFER_FAILED();

  uint256 constant PLATFORM_PROJECT_ID = 1;

  IJBDirectory public immutable jbxDirectory;
  IERC721 public immutable jbxProjects;
  IMintFor public immutable token;

  /**
   * @notice Maps ERC721 tokens to the amount necessary to mint one of the NFTs managed by this contract.
   */
  mapping(address => uint256) public conversionRate;

  // TODO: consider allowing matching token ids of sacrificed tokens to the newly minted token as a setting
  constructor(
    IJBOperatorStore _jbxOperatorStore,
    IJBDirectory _jbxDirectory,
    IERC721 _jbxProjects,
    IMintFor _token
  ) {
    operatorStore = _jbxOperatorStore; // JBOperatable

    jbxDirectory = _jbxDirectory;
    jbxProjects = _jbxProjects;

    token = _token;
  }

  //*********************************************************************//
  // ----------------------- external operations ----------------------- //
  //*********************************************************************//

  /**
   *
   * @param _from Current owner address.
   * @param _token NFT contract from which tokens are being sacrificed
   * @param _tokenIds Token ids to sacrifice.
   * @param _to New NFT owner address.
   */
  function mint(
    address _from,
    IERC721 _token,
    uint256[] calldata _tokenIds,
    address _to
  ) external returns (uint256 tokenId) {
    uint256 rate = conversionRate[address(_token)];
    if (rate == 0) {
      revert TOKEN_UNSUPPORTED();
    }

    if (_tokenIds.length < rate) {
      revert INSUFFICIENT_TOKENS();
    }

    uint256 balance = _token.balanceOf(address(this));
    for (uint256 i; i < _tokenIds.length; ) {
      _token.transferFrom(_from, address(this), _tokenIds[i]);
      unchecked {
        ++i;
      }
    }

    if (_token.balanceOf(address(this)) != balance + rate) {
      revert TRANSFER_FAILED();
    }

    tokenId = token.mintFor(_to);
  }

  //*********************************************************************//
  // ---------------------- privileged operations ---------------------- //
  //*********************************************************************//

  function setConversionRate(
    address _token,
    uint256 _amount
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(PLATFORM_PROJECT_ID),
      PLATFORM_PROJECT_ID,
      JBOperations.MANAGE_PAYMENTS,
      (msg.sender == address(jbxDirectory.controllerOf(PLATFORM_PROJECT_ID)))
    )
  {
    conversionRate[_token] = _amount;
  }

  function transferTokens(
    IERC721 _token,
    uint256[] calldata _tokenIds,
    address _to
  )
    external
    requirePermissionAllowingOverride(
      jbxProjects.ownerOf(PLATFORM_PROJECT_ID),
      PLATFORM_PROJECT_ID,
      JBOperations.MANAGE_PAYMENTS,
      (msg.sender == address(jbxDirectory.controllerOf(PLATFORM_PROJECT_ID)))
    )
  {
    for (uint256 i; i < _tokenIds.length; ) {
      _token.transferFrom(address(this), _to, _tokenIds[i]);
      unchecked {
        ++i;
      }
    }
  }
}
