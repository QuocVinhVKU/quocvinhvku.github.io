export const validBalance=value=>Number.isSafeInteger(value)&&value>=0&&value<=10000;
export function manualBalance(config){return validBalance(config?.statsOverrides?.balance)?config.statsOverrides.balance:null;}
export function protectedBalance(config){
 if(validBalance(config?.balanceClose?.value)&&config.balanceClose.capturedAt)return {value:config.balanceClose.value,source:'closed'};
 const value=manualBalance(config);return value===null?null:{value,source:'manual'};
}
