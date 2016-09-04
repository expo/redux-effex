// @flow
import _ from 'lodash';

type ReduxStore = {
  dispatch: Function,
  getState: () => Object
};

export type EffectParams = {
  action: Object,
  dispatch: (action: any) => void,
  getState: () => any,
  nextDispatchAsync: (actionType: string) => Promise<Object>,
};

export type EffectErrorHandlerParams = {
  action: Object,
  dispatch: (action: any) => void,
  getState: () => any,
  nextDispatchAsync: (actionType: string) => Promise<Object>,
  error: Object,
};

export type EffectFunction = (params: EffectParams) => Promise<any>;

export type EffectDefinition = {
  action: string,
  effect: EffectFunction,
  error?: (params: EffectErrorHandlerParams) => any
};

export const effectsMiddleware = (effectsDefinitionArray: Array<EffectDefinition>) => {
  let _waiting = {};

  const _effects = _.reduce(effectsDefinitionArray, (result, effectDefinition) => {
    let { action: actionType, effect, error } = effectDefinition;
    result[actionType] = result[actionType] || [];
    effect.__errorHandler = error;
    result[actionType].push(effect);
    return result;
  }, {});

  const nextDispatchAsync = async (actionType) => {
    _waiting[actionType] = _waiting[actionType] || [];

    return new Promise(resolve => {
      _waiting[actionType].push(resolve);
    });
  }

  const callEffect = async (effect, action, store) => {
    let params = {
      action,
      dispatch: store.dispatch,
      getState: store.getState,
      nextDispatchAsync,
    };

    if (effect.__errorHandler) {
      try {
        await effect(params);
      } catch(error) {
        effect.__errorHandler({error, ...params});
      }
    } else {
      effect(params);
    }
  };

  return (store: ReduxStore) => (next: Function) => (action: Object) => {
    let result = next(action);

    _.forEach(_effects[action.type], effect => {
      callEffect(effect, action, store)
    });

    if (typeof _waiting[action.type] !== 'undefined') {
      _waiting[action.type].forEach(resolve => resolve(action));
      delete _waiting[action.type];
    }

    return result
  }
}
