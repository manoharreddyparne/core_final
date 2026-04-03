import { coreApiClient } from '../../auth/api/base';

export const examService = {
  getEligibleExams: async () => {
    const response = await coreApiClient.get('exams/eligible/');
    return response.data;
  },

  startAttempt: async (examId: string, fingerprint: string) => {
    const response = await coreApiClient.post('exams/exam-attempts/', { exam: examId, fingerprint });
    return response.data;
  },

  logViolation: async (attemptId: string, eventType: string, details: any, imageUrl?: string) => {
    const response = await coreApiClient.post(`exams/exam-attempts/${attemptId}/log_violation/`, {
      event_type: eventType,
      details,
      image_url: imageUrl
    });
    return response.data;
  },

  submitAnswer: async (attemptId: string, mappingId: string, data: { text_answer?: string, option_ids?: number[] }) => {
    const response = await coreApiClient.post(`exams/exam-attempts/${attemptId}/submit_answer/`, {
      mapping_id: mappingId,
      ...data
    });
    return response.data;
  },

  finishExam: async (attemptId: string) => {
    const response = await coreApiClient.post(`exams/exam-attempts/${attemptId}/finish/`);
    return response.data;
  }
};
