class Logger {
  private isProduction = import.meta.env.PROD;

  constructor() {
    if (this.isProduction) {
      console.log = () => {};
      console.info = () => {};
      console.warn = () => {};
    }
  }

  log(message?: any, ...optionalParams: any[]) {
    if (!this.isProduction) {
      console.log(message, ...optionalParams);
    }
  }

  info(message?: any, ...optionalParams: any[]) {
    if (!this.isProduction) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message?: any, ...optionalParams: any[]) {
    if (!this.isProduction) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message?: any, ...optionalParams: any[]) {
    // Keep errors active in all environments for telemetry capturing
    console.error(message, ...optionalParams);
  }
}

export const logger = new Logger();
