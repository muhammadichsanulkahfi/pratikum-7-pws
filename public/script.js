
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const sendButton = document.getElementById('sendButton');

let conversation = [
    {
        role: "assistant",
        content: "Halo! Ada yang bisa saya bantu?"
    }
];

function addMessage(content, sender) {
    const message = document.createElement('div');

    message.classList.add('message');
    message.classList.add(
        sender === 'user' ? 'user-message' : 'bot-message'
    );

    message.textContent = content;

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) return;

    addMessage(message, 'user');

    conversation.push({
        role: "user",
        content: message
    });

    messageInput.value = '';
    sendButton.disabled = true;

    const botMessage = addMessage('', 'bot');

    try {
        const response = await fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: conversation
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let answer = '';
        let finished = false;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, {
                stream: true
            });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (!trimmedLine.startsWith('data:')) {
                    continue;
                }

                const data = trimmedLine.slice(5).trim();

                if (data === '[DONE]') {
                    finished = true;
                    break;
                }

                try {
                    const content = JSON.parse(data);

                    if (typeof content === 'string') {
                        answer += content;
                        botMessage.textContent = answer;

                        chatMessages.scrollTop =
                            chatMessages.scrollHeight;
                    }
                } catch (error) {
                    console.error('Gagal membaca data:', error);
                }
            }

            if (finished) break;
        }

        if (answer) {
            conversation.push({
                role: "assistant",
                content: answer
            });
        } else {
            botMessage.textContent = 'Maaf, tidak ada jawaban.';
        }

    } catch (error) {
        console.error('Error:', error);
        botMessage.textContent = 'Terjadi kesalahan: ' + error.message;
    }

    sendButton.disabled = false;
    messageInput.focus();
});
