
function measureRTTs(landmarks, addRtt) {

    landmarks.forEach(lm => {
        const socket = new WebSocket(lm.ws_url);

        socket.onopen = function () {
            // console.log(`ws to ${lm.name} opened`);
            socket.send(Date.now());
        };

        socket.onerror = function (error) {
            // console.log(`ws to ${lm.name} error: ${error}`);
        };

        socket.onclose = function () {
            // console.log(`ws to ${lm.name} closed`);
        };

        var cnt = 0;

        socket.onmessage = function (event) {
            // console.log('Message from server: ' + event.data);
            const rtt = Date.now() - parseInt(event.data);
            // console.log(`RTT to ${lm.name}: ${rtt}ms, cnt: ${cnt}  `);
            addRtt(lm.name, rtt / 1000);

            if (cnt < 5) {
                setTimeout(function () {
                    socket.send(Date.now());
                }, 500);
                cnt++;
            } else {
                socket.close();
            }



        };

    });

}

export default measureRTTs;