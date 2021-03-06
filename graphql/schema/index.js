const { buildSchema } = require('graphql')

const schema = buildSchema(`
  type Ticket {
    _id: ID!
    title: String!
    description: String!
    hiPri: Boolean!
    label: String!
    status: String!
    creator: User!
    assignee: User
    createdDate: String!
    updatedDate: String!
    comments: [CommentData!]!
  }

  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    createdTickets: [Ticket!]!
    assignedTickets: [Ticket]!
    comments: [CommentData!]!
  }

  type Comment {
    _id: ID!
    user: ID!
    ticket: ID!
    content: String!
    createdDate: String!
    updatedDate: String!
  }

  type AuthData {
    userId: ID!
    token: String!
  }

  type UpdateStatusData {
    status: String!
    updatedDate: String!
  }

  type CommentData {
    _id: ID!
    user: User!
    ticket: ID!
    content: String!
    createdDate: String!
    updatedDate: String!
  }

  input TicketInput {
    title: String!
    description: String!
    hiPri: Boolean!
    label: String!
    creator: String!
    createdDate: String!
    updatedDate: String!
  }

  input UserInput {
    email: String!
    password: String!
    name: String!
  }

  type RootQuery {
    getTickets: [Ticket!]!
    getTicket(ticketId: ID!): Ticket!
    signIn(email: String!, password: String!): AuthData!
    searchUsers(text: String!): [User]!
  }

  type RootMutation {
    createTicket(ticketInput: TicketInput): Ticket
    createUser(userInput: UserInput): User
    assignTicket(userEmail: String, ticketId: ID): Ticket
    updateStatus(ticketId: ID, status: String): UpdateStatusData
    comment(ticketId: ID, currentUser: ID, text: String): Comment
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

module.exports = schema;