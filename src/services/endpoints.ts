const authEndpoints = {
  authRegister: "/auth/register",
  authLogin: "/auth/login",
  authMe: "/auth/profile",
};
const usersEndpoints = {
  stats: "/users/stats",
  edite: (id: string) => `/users/${id}/info`,
  notifications: "/users/me/notifications",
  unreadCount: "/users/me/notifications/unread-count",
  readNotification: (id: number | string) => `/users/me/notifications/${id}/read`,
  readAllNotifications: "/users/me/notifications/read-all",
};
const gamesEndpoints = {
  games: "/games",
  completeGame: (id: number | string) => `/games/${id}/complete`,
  reclamSeen: "/games/reclam-seen",
};

const reaclamsEndpoints = {
  reaclams: "/reaclams",
};

const boostsEndpoints = {
  boosts: "/boosts",
  getBoosts: (id: number) => `/boosts/${id}`,
  buyBoosts: (id: number) => `/boosts/${id}/buy`,
  consumeBoost: () => `/boosts/use`,
  spinItems: "/boosts/spin/items",
  spin: "/boosts/spin",
};

const challengesEndpoints = {
  challenges: "/challenges",
  challengeDetail: (id: number | string) => `/challenges/${id}`,
  connectChallenge: (id: number | string) => `/challenges/${id}/connect`,
  challengeDays: (id: number | string) => `/challenges/${id}/days`,
  dayGames: (dayId: number | string) => `/challenges/days/${dayId}/games`,
  reclamSeen: (dayId: number | string) => `/challenges/days/${dayId}/reclam-seen`,
  completeDayGame: (challengeDayGameId: number | string) =>
    `/challenges/day-games/${challengeDayGameId}/complete`,
  startDay: (dayId: number | string) => `/challenges/days/${dayId}/start`,
  dayScore: (dayId: number | string) => `/challenges/days/${dayId}/score`,
  completeDay: (dayId: number | string) => `/challenges/days/${dayId}/complete`,
  updateDayStatus: (dayId: number | string) => `/challenges/days/${dayId}/status`,
  challengeProgress: (id: number | string) => `/challenges/${id}/progress`,
  challengeLeaderboard: (id: number | string) =>
    `/challenges/${id}/leaderboard`,
};

export {
  authEndpoints,
  boostsEndpoints,
  challengesEndpoints,
  gamesEndpoints,
  reaclamsEndpoints,
  usersEndpoints,
};
