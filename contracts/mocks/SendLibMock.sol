// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

struct Packet {
    uint64 nonce;
    uint32 srcEid;
    address sender;
    uint32 dstEid;
    bytes32 receiver;
    bytes32 guid;
    bytes message;
}

contract SendLibMock {
    address public immutable endpoint;

    constructor(address _endpoint) {
        endpoint = _endpoint;
    }

    function send(
        Packet calldata,
        bytes calldata _options,
        bool
    )
        external
        pure
        returns (
            MessagingFee memory fee,
            bytes memory encodedPacket,
            bytes memory options
        )
    {
        fee = MessagingFee(0, 0);
        encodedPacket = "";
        options = _options;
    }

    function quote(
        Packet calldata,
        bytes calldata,
        bool
    ) external pure returns (MessagingFee memory fee) {
        fee = MessagingFee(0, 0);
    }

    function isSupportedEid(uint32) external pure returns (bool) {
        return true;
    }

    function version() external pure returns (uint64 major, uint8 minor, uint8 endpointVersion) {
        return (1, 0, 2);
    }

    function messageLibType() external pure returns (uint8) {
        return 2; // SendAndReceive
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
