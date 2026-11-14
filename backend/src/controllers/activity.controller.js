import { storageService } from '../services/storage.service.js';

export const activityController = {
  async getActivity(req, res, next) {
    try {
      const [activities, documents] = await Promise.all([
        storageService.getActivitiesByUser(req.user._id, 40),
        storageService.getDocumentsByUser(req.user._id),
      ]);

      res.status(200).json({
        success: true,
        activities,
        documents,
        stats: {
          totalDocuments: documents.length,
          totalActivities: activities.length,
          translationsCount: activities.filter((a) => a.type === 'TRANSLATE').length,
          imageDescriptionsCount: activities.filter((a) => a.type === 'IMAGE_DESCRIBE').length,
          assistantChatsCount: activities.filter((a) => a.type === 'ASSISTANT_CHAT').length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
