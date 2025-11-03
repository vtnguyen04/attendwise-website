package pubsub

import "github.com/nats-io/nats.go"

type NatsPublisher struct {
	nc *nats.Conn
}

func NewNatsPublisher(nc *nats.Conn) *NatsPublisher {
	return &NatsPublisher{nc: nc}
}

func (p *NatsPublisher) Publish(subject string, data []byte) error {
	return p.nc.Publish(subject, data)
}
