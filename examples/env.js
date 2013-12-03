// environment settings
var env = {
  host:       "127.0.0.1",
  port:       3000,
  namespace:  "test",
  set:        "demo",
  nops:       1000
}

// client settings
env.config = {
    hosts: [
      { addr: env.host, port: env.port }
    ]
}

module.exports = env