importScripts(
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);

importScripts(
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

// A configuração do Firebase chega no endereço de registro (ver fcmService.ts),
// porque este arquivo fica na pasta public e não recebe as variáveis VITE_
const parametros = new URL(self.location.href).searchParams;

firebase.initializeApp({
    apiKey: parametros.get("apiKey"),
    authDomain: parametros.get("authDomain"),
    projectId: parametros.get("projectId"),
    storageBucket: parametros.get("storageBucket"),
    messagingSenderId: parametros.get("messagingSenderId"),
    appId: parametros.get("appId")
});

const messaging = firebase.messaging();

// Com o MenteUp fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
    // Quando a mensagem tem título e texto, o próprio Firebase já mostra a notificação
    // (e o clique abre o link enviado pelo back-end); mostrar de novo duplicaria o aviso
    if (payload.notification) {
        return;
    }

    self.registration.showNotification(payload.data?.titulo || "MenteUp", {
        body: payload.data?.mensagem || "Você recebeu uma nova notificação.",
        icon: "/icon-192.png",
        data: payload.data || {}
    });
});

// Clique na notificação: abre a tela indicada no campo "url" (desafio, atividades ou resultado)
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const dados = event.notification.data || {};
    const url = dados.url || dados.FCM_MSG?.data?.url || "/aluno/atividades";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
            // Usa uma aba do MenteUp que já esteja aberta
            for (const aba of abas) {
                if ("focus" in aba) {
                    return aba.focus().then(() => aba.navigate(url));
                }
            }
            // Se não houver nenhuma, abre uma nova
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
