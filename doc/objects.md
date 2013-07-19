# Objects

## Error

    Error := {
      code: Integer,
      message: String,
      file: String,
      line: Integer,
      func: String
    }

## Config

    Config := {
      hosts: [ { addr: String, port: Integer } ]
    }

## Key

    Key := {
      ns: String,
      set: String,
      value: Object,
      digest: Buffer
    }

## Metadata

    Metadata := {
      ttl: Integer,
      gen: Integer,
    }

## Record

    Record := {
      key: Key,
      metadata: Metadata,
      bins: {
        [bin]: Object
      }
    }

