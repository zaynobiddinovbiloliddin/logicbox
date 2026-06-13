import { instance } from "../client";
import { usersEndpoints } from "../endpoints";

const UsersModule = {
  async getStats() {
    const { data } = await instance.get(usersEndpoints.stats);
    return data;
  },

  async editProfile(
    id: string,
    obj: { name: string; phoneNumber: string; age: number | null }
  ) {
    const { data } = await instance.patch(usersEndpoints.edite(id), obj);
    return data;
  },

  async getNotifications() {
    const { data } = await instance.get(usersEndpoints.notifications);
    return data;
  },

  async getUnreadNotificationsCount() {
    const { data } = await instance.get(usersEndpoints.unreadCount);
    return data;
  },

  async readNotification(id: number | string) {
    const { data } = await instance.patch(usersEndpoints.readNotification(id));
    return data;
  },

  async readAllNotifications() {
    const { data } = await instance.patch(usersEndpoints.readAllNotifications);
    return data;
  },
};

export { UsersModule };
