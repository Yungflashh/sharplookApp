2026-03-07 01:28:06 error: ❌ Failed to send Expo push notification: Request failed with status code 400
AxiosError: Request failed with status code 400
    at settle (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:2151:12)
    at IncomingMessage.handleStreamEnd (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:3545:11)
    at IncomingMessage.emit (node:events:531:35)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
    at Axios.request (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:4796:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async NotificationService.sendExpoNotification (/opt/render/project/src/dist/services/notification.service.js:224:30)
    at async NotificationService.sendPushNotification (/opt/render/project/src/dist/services/notification.service.js:190:17)
    at async Promise.allSettled (index 0)
    at async NotificationService.sendNotification (/opt/render/project/src/dist/services/notification.service.js:147:13)
    at async NotificationService.createNotification (/opt/render/project/src/dist/services/notification.service.js:125:9)
    at async NotificationHelper.notifyBookingCreated (/opt/render/project/src/dist/utils/notificationHelper.js:68:17)
    at async BookingService.createBookingWithPayment (/opt/render/project/src/dist/services/booking.service.js:198:17)
    at async /opt/render/project/src/dist/controllers/booking.controller.js:25:28
2026-03-07 01:28:06 error: Failed to send push notification: Request failed with status code 400
AxiosError: Request failed with status code 400
    at settle (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:2151:12)
    at IncomingMessage.handleStreamEnd (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:3545:11)
    at IncomingMessage.emit (node:events:531:35)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
    at Axios.request (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:4796:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async NotificationService.sendExpoNotification (/opt/render/project/src/dist/services/notification.service.js:224:30)
    at async NotificationService.sendPushNotification (/opt/render/project/src/dist/services/notification.service.js:190:17)
    at async Promise.allSettled (index 0)
    at async NotificationService.sendNotification (/opt/render/project/src/dist/services/notification.service.js:147:13)
    at async NotificationService.createNotification (/opt/render/project/src/dist/services/notification.service.js:125:9)
    at async NotificationHelper.notifyBookingCreated (/opt/render/project/src/dist/utils/notificationHelper.js:68:17)
    at async BookingService.createBookingWithPayment (/opt/render/project/src/dist/services/booking.service.js:198:17)
    at async /opt/render/project/src/dist/controllers/booking.controller.js:25:28
2026-03-07 01:28:06 info: Notification created: 69ab7f26bfc9ae91220b8edc for user 69139ad6216751711e35e1fd
2026-03-07 01:28:06 info: Booking created notifications sent for booking 69ab7f23bfc9ae91220b8ec7
2026-03-07 01:28:07 info: Found 9 device token(s) for user 69139ad6216751711e35e1fd
2026-03-07 01:28:07 info: Token breakdown: 9 Expo, 0 FCM
2026-03-07 01:28:07 info: Sending Expo push notification to 9 device(s)
2026-03-07 01:28:07 error: ❌ Failed to send Expo push notification: Request failed with status code 400
AxiosError: Request failed with status code 400
    at settle (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:2151:12)
    at IncomingMessage.handleStreamEnd (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:3545:11)
    at IncomingMessage.emit (node:events:531:35)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
    at Axios.request (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:4796:41)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async NotificationService.sendExpoNotification (/opt/render/project/src/dist/services/notification.service.js:224:30)
    at async NotificationService.sendPushNotification (/opt/render/project/src/dist/services/notification.service.js:190:17)
    at async Promise.allSettled (index 0)
    at async NotificationService.sendNotification (/opt/render/project/src/dist/services/notification.service.js:147:13)
    at async NotificationService.createNotification (/opt/render/project/src/dist/services/notification.service.js:125:9)
    at async NotificationHelper.notifyPaymentSuccessful (/opt/render/project/src/dist/utils/notificationHelper.js:497:13)
    at async BookingService.createBookingWithPayment (/opt/render/project/src/dist/services/booking.service.js:199:17)
    at async /opt/render/project/src/dist/controllers/booking.controller.js:25:28
2026-03-07 01:28:07 error: Failed to send push notification: Request failed with status code 400
AxiosError: Request failed with status code 400
    at settle (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:2151:12)
    at IncomingMessage.handleStreamEnd (/opt/render/project/src/node_modules/axios/dist/node/axios.cjs:3545:11)
    at IncomingMessage.emit (node:events:531:35)
    at endReadableNT (node:internal/streams/readable:1698:12)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)