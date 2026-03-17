import api from "./api";

export const getWidgetAudiences = () => api.get("/widget/audiences");
export const getWidgetPlans = (audienceId) =>
  api.get("/widget/plans", { params: { audience: audienceId } });
export const getWidgetTopics = (audienceId, planId) =>
  api.get("/widget/topics", { params: { audience: audienceId, plan: planId } });
export const getWidgetPathway = (audienceId, planId, topicId) =>
  api.get("/widget/pathway", {
    params: { audience: audienceId, plan: planId, topic: topicId },
  });
export const postWidgetEvent = (data) => api.post("/widget/event", data);
