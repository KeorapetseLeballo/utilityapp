export const typeDefs = `#graphql
  scalar JSON
  scalar DateTime

  enum UserRole { RESIDENT PROVIDER ADMIN }
  enum VerificationStatus { PENDING APPROVED REJECTED }
  enum SubscriptionStatus { PENDING ACTIVE PAUSED CANCELLED }
  enum OccurrenceStatus { SCHEDULED COMPLETED SKIPPED DISPUTED CANCELLED }

  type Neighborhood {
    id: ID!
    name: String!
    slug: String!
    description: String
    postcodes: [String!]!
  }

  type User {
    id: ID!
    email: String!
    name: String!
    phone: String
    role: UserRole!
    postcode: String
    neighborhood: Neighborhood
    providerProfile: ProviderProfile
  }

  type ProviderProfile {
    id: ID!
    bio: String
    verificationStatus: VerificationStatus!
    insuranceUrl: String
    licenseUrl: String
    backgroundCheck: Boolean!
    neighborhood: Neighborhood!
    user: User!
  }

  type ServiceCategory {
    id: ID!
    slug: String!
    name: String!
    description: String
    icon: String
  }

  type ServiceListing {
    id: ID!
    title: String!
    description: String!
    monthlyPrice: Int!
    frequency: String!
    capacity: Int!
    status: String!
    autoAccept: Boolean!
    categoryFields: JSON!
    category: ServiceCategory!
    neighborhood: Neighborhood!
    provider: ProviderProfile!
    providerName: String!
    averageRating: Float
    activeSubscribers: Int!
  }

  type Subscription {
    id: ID!
    status: SubscriptionStatus!
    startDate: DateTime!
    billingDay: Int!
    scheduleDays: [Int!]!
    scheduleTime: String
    pausedUntil: DateTime
    listing: ServiceListing!
    resident: User!
    occurrences: [Occurrence!]!
    payments: [Payment!]!
  }

  type Occurrence {
    id: ID!
    scheduledAt: DateTime!
    status: OccurrenceStatus!
    completedAt: DateTime
    disputeReason: String
  }

  type Payment {
    id: ID!
    amount: Int!
    platformFee: Int!
    providerAmount: Int!
    status: String!
    periodStart: DateTime!
    periodEnd: DateTime!
  }

  type Review {
    id: ID!
    rating: Int!
    comment: String
    reviewer: User!
    createdAt: DateTime!
  }

  type Message {
    id: ID!
    body: String!
    sender: User!
    flagged: Boolean!
    createdAt: DateTime!
  }

  type Notification {
    id: ID!
    type: String!
    title: String!
    body: String!
    read: Boolean!
    createdAt: DateTime!
  }

  type AdminStats {
    pendingProviders: Int!
    activeListings: Int!
    activeSubscriptions: Int!
    openDisputes: Int!
    flaggedMessages: Int!
  }

  type ProviderEarnings {
    total: Int!
    paymentCount: Int!
  }

  type Query {
    me: User
    neighborhoods: [Neighborhood!]!
    categories: [ServiceCategory!]!
    listings(categorySlug: String, minPrice: Int, maxPrice: Int): [ServiceListing!]!
    listing(id: ID!): ServiceListing
    mySubscriptions: [Subscription!]!
    providerSubscriptions: [Subscription!]!
    providerListings: [ServiceListing!]!
    upcomingOccurrences: [Occurrence!]!
    listingReviews(listingId: ID!): [Review!]!
    messages(subscriptionId: ID!): [Message!]!
    notifications: [Notification!]!
    unreadNotificationCount: Int!
    adminStats: AdminStats!
    pendingProviders: [ProviderProfile!]!
    providerEarnings: ProviderEarnings!
  }

  input CreateListingInput {
    categorySlug: String!
    title: String!
    description: String!
    monthlyPrice: Int!
    frequency: String!
    capacity: Int
    autoAccept: Boolean
    categoryFields: JSON!
  }

  input CreateSubscriptionInput {
    listingId: ID!
    scheduleDays: [Int!]!
    scheduleTime: String
    emergencyContact: JSON
  }

  input CreateReviewInput {
    subscriptionId: ID!
    rating: Int!
    comment: String
  }

  input SendMessageInput {
    subscriptionId: ID!
    body: String!
  }

  type Mutation {
    createListing(input: CreateListingInput!): ServiceListing!
    createSubscription(input: CreateSubscriptionInput!): Subscription!
    acceptSubscription(id: ID!): Subscription!
    pauseSubscription(id: ID!, until: DateTime): Subscription!
    cancelSubscription(id: ID!): Subscription!
    skipOccurrence(id: ID!): Occurrence!
    completeOccurrence(id: ID!): Occurrence!
    disputeOccurrence(id: ID!, reason: String!): Occurrence!
    createReview(input: CreateReviewInput!): Review!
    sendMessage(input: SendMessageInput!): Message!
    flagMessage(id: ID!): Message!
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Int!
    approveProvider(id: ID!): ProviderProfile!
    rejectProvider(id: ID!): ProviderProfile!
    updateProviderProfile(bio: String, insuranceUrl: String, licenseUrl: String, backgroundCheck: Boolean): ProviderProfile!
  }
`;
