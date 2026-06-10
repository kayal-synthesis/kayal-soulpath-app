self.addEventListener('push', function(event) {
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      day: data.day
    },
    actions: [
      {
        action: 'view',
        title: 'View My Day'
      },
      {
        action: 'later',
        title: 'Later'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})