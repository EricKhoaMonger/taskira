const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('config');
const Fawn = require('fawn');

const Ticket = require('../../models/ticket');
const User = require('../../models/user');

Fawn.init(mongoose);

const mapTicketData = (ticketData) => {
  let mappedTicketData = {
    ...ticketData._doc,
    creator: queryUser.bind(this, ticketData.creator)
  };

  if (ticketData.assignee) {
    return {
      ...mappedTicketData,
      assignee: queryUser.bind(this, ticketData.assignee)
    }
  };

  return mappedTicketData;
};

const mapUserData = (userData) => {
  return {
    ...userData._doc,
    createdTickets: queryTickets.bind(this, userData.createdTickets),
    assignedTickets: queryTickets.bind(this, userData.assignedTickets)
  };
}

const queryUser = async userId => {
  try {

    const user = await User.findById(userId);

    return mapUserData(user);

  } catch (err) {
    throw err;
  }
};

const queryTickets = async ticketIds => {
  try {

    const tickets = await Ticket.find({ _id: { $in: ticketIds } });

    return tickets.map(t => mapTicketData(t));

  } catch (error) {
    throw error
  }
};

const resolver = {
  createTicket: async (args, req) => {
    if (!req.isAuth) throw new Error("Unauthenticated");

    try {

      const ticket = new Ticket({
        title: args.ticketInput.title,
        description: args.ticketInput.description,
        hiPri: args.ticketInput.hiPri,
        creator: req.userId,
        label: args.ticketInput.label,
        createdDate: new Date(args.ticketInput.createdDate)
      });

      new Fawn.Task()
        .save('tickets', ticket)
        .update('users', { _id: ticket.creator }, {
          $push: { createdTickets: ticket._id }
        })
        .run();

      return mapTicketData(ticket);

    } catch (err) {
      throw err;
    }
  },

  createUser: async (args, req) => {
    if (!req.isAuth) throw new Error("Unauthenticated");

    try {

      const oldUser = await User.findOne({ email: args.userInput.email });
      if (oldUser) throw new Error("User exists");

      const hashedPwd = await bcrypt.hash(args.userInput.password, 12);
      const userObj = new User({
        email: args.userInput.email,
        password: hashedPwd
      });

      const newUser = await userObj.save();

      return {
        ...newUser._doc,
        token: newUser.generateAuthToken()
      };

    } catch (error) {
      throw error;
    }
  },

  signIn: async args => {
    try {

      const { email, password } = args.userInput;

      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found")

      const pwdMatch = await bcrypt.compare(password, user.password);
      if (!pwdMatch) throw new Error("Password doesn't match");

      return {
        userId: user._id,
        token: user.generateAuthToken()
      }

    } catch (err) {
      throw err;
    }
  },

  getTickets: async () => {
    try {

      const tickets = await Ticket.find();

      return tickets.map(t => {
        if (!t.assignee) return mapTicketData(t);

        return mapTicketData(t);
      });

    } catch (err) {
      throw err;
    }
  },

  getTicket: async ({ ticketId }) => {
    try {

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) throw new Error("Ticket not found!");

      if (!ticket.assignee) return mapTicketData(ticket);

      return mapTicketData(ticket);

    } catch (err) {
      throw err;
    }
  },

  assignTicket: async ({ userEmail, ticketId }, req) => {
    if (!req.isAuth) throw new Error("Unauthenticated");

    try {

      const user = await User.findOne({ email: userEmail });
      const ticket = await Ticket.findById(ticketId);

      new Fawn.Task()
        .update('tickets', { _id: ticket._id }, {
          $set: { assignee: user }
        })
        .update('users', { _id: user._id }, {
          $push: { assignedTickets: ticket._id }
        })

      return {
        ...ticket._doc,
        assignee: queryUser.bind(this, user._id),
        creator: queryUser.bind(this, ticket.creator)
      }

    } catch (err) {
      throw err;
    }
  }
};

module.exports = resolver;