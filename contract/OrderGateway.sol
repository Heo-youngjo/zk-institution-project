// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRegistry {
    function isLoggedIn(address user) external view returns (bool);
}

contract OrderGateway {
    IRegistry public registry;
    uint256 public nextOrderId;

    struct Order {
        uint256 id;
        address user;
        uint256 amount;
        uint256 submittedAt;
    }

    mapping(uint256 => Order) public orders;

    event OrderSubmitted(uint256 indexed orderId, address indexed user, uint256 amount);

    constructor(address _registry) {
        registry = IRegistry(_registry);
    }

    function submitOrder(uint256 amount) external {
        require(registry.isLoggedIn(msg.sender), "Not logged in");

        nextOrderId += 1;
        orders[nextOrderId] = Order({
            id: nextOrderId,
            user: msg.sender,
            amount: amount,
            submittedAt: block.timestamp
        });

        emit OrderSubmitted(nextOrderId, msg.sender, amount);
    }
}