docker build . -t homebridgy
docker run --net=host -v /home/veon/work/iot/homebridge-smartthings/:/usr/local/lib/node_modules/homebridge-smartthings-veon homebridgy:latest