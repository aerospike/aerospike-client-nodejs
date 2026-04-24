// types/arrayDefaults.ts

export type StringDefaults = {
  random: boolean;
  length: {
    min: number;
    max: number;
  };
  prefix: string;
  suffix: string;
  charset: string;
};

export type BytesDefaults = {
  length: {
    min: number;
    max: number;
  };
  byte: {
    min: number;
    max: number;
  };
};

export type IntegerDefaults = {
  random: boolean;
  min: number;
  max: number;
};

export type DoubleDefaults = {
  random: boolean;
  min: number;
  max: number;
  step: number;
};

export type GeneratorFunction = () => number | string | Uint8Array;

export type ArrayDefaults = {
  values: GeneratorFunction[];
};

export interface Options {
  help: boolean;
  host: string | null;
  port: number | null;
  totalTimeout: number;
  log: number;
  log_file: number;
  namespace: string;
  set: string;
  user: string | null;
  password: string | null;
  clusterName?: string;
  cafile?: string;
  keyfile?: string;
  keyfilePassword?: string;
  certfile?: string;
  auth?: string;
}

export type Defaults = StringDefaults | BytesDefaults | IntegerDefaults | DoubleDefaults | ArrayDefaults;

export interface TypeOptions {
  defaults: Defaults
}

export interface ExtendedOptions extends Options, TypeOptions {}

