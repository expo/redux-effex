# redux-effex

I like using [async/await](https://blog.getexponent.com/react-native-meets-async-functions-3e6f81111173),
and while I found that [redux-saga](https://github.com/yelouafi/redux-saga) solves pretty much any problem
it sets out to, I don't have most of those problems, and I don't want to
force other developers working on my codebases to suddenly become
experts with generators and the fairly large redux-saga API.

# Example

#### Store.js

```javascript
/**
 * @providesModule Store
 * @flow
 */

import { applyMiddleware, combineReducers, createStore } from 'redux';
import { effectsMiddleware } from 'redux-effex';

import ApiStateReducer from 'ApiStateReducer';
import CurrentUserReducer from 'CurrentUserReducer';
import HistoryReducer from 'HistoryReducer';
import Effects from 'Effects';

export default createStore(
  combineReducers({
    currentUser: CurrentUserReducer,
    history: HistoryReducer,
    apiState: ApiStateReducer,
  }),
  applyMiddleware(effectsMiddleware(Effects)),
);
```

#### Effects.js

```javascript
/**
 * @providesModule Effects
 * @flow
 */

import ActionTypes from 'ActionTypes';
import type { EffectErrorHandlerParams } from 'redux-effex';

import openAppAsync from 'openAppAsync';
import signInAsync from 'signInAsync';
import signOutAsync from 'signOutAsync';

function genericErrorHandler({action, error}: EffectErrorHandlerParams) {
  console.log({error, action});
}

export default [
  {action: ActionTypes.OPEN_APP, effect: openAppAsync, error: genericErrorHandler},
  {action: ActionTypes.SIGN_OUT, effect: signOutAsync, error: genericErrorHandler},
  {action: ActionTypes.SIGN_IN, effect: signInAsync, error: genericErrorHandler},
];
```

#### openAppAsync.js

```javascript
/**
 * @providesModule openAppAsync
 * @flow
 */

import { Alert, Linking } from 'react-native';
import type { EffectParams } from 'redux-effex';

import AppDataApi from 'AppDataApi';
import Actions from 'Actions';
import ActionTypes from 'ActionTypes';
import LocalStorage from 'LocalStorage';

export default async function openAppAsync({action, dispatch, getState}: EffectParams) {
  let { app } = action;

  if (typeof app === 'string') {
    app = await fetchAppDataAsync(app, dispatch);
  }

  dispatch(Actions.addAppToHistory(app));
  const { history } = getState();
  LocalStorage.saveHistoryAsync(history);

  AppDataApi.incrementViewCountAsync(app.url_token);
  Linking.openURL(`exp://rnplay.org/apps/${app.url_token}`);
}

async function fetchAppDataAsync(url, dispatch) {
  let app;

  try {
    dispatch(Actions.showGlobalLoading());
    let httpUrl = url.indexOf('rnplay:') === 0 ? url.replace('rnplay:', 'http:') : url;
    app = await AppDataApi.fetchAppDataAsync(httpUrl);
  } catch(e) {
    Alert.alert(
      'Error',
      `There was a problem loading ${url}.`,
      [
        {text: 'Try again', onPress: () => dispatch(Actions.openApp(url))},
        {text: 'Cancel', style: 'cancel'},
      ]
    );
    throw e;
  } finally {
    dispatch(Actions.hideGlobalLoading());
  }

  return app;
}
```

#### signInAsync.js

```javascript
/**
 * @providesModule signInAsync
 * @flow
 */

import type { EffectParams } from 'redux-effex';

import Actions from 'Actions';
import LocalStorage from 'LocalStorage';

export default async function signInAsync({action, dispatch}: EffectParams) {
  let { user } = action;

  await LocalStorage.saveUserAsync(user);
  dispatch(Actions.setCurrentUser(user));
}
```

#### signOutAsync.js

```javascript
/**
 * @providesModule signOutAsync
 * @flow
 */

import type { EffectParams } from 'redux-effex';

import Actions from 'Actions';
import LocalStorage from 'LocalStorage';

export default async function signOutAsync({action, dispatch}: EffectParams) {
  await LocalStorage.clearAll();
  dispatch(Actions.setCurrentUser(null));
}
```

## A contrived example of waiting for another action

#### waitForAllStepsAsync.js

```javascript
/**
 * @providesModule waitForAllStepsAsync
 * @flow
 */

import type { EffectParams } from 'redux-effex';

import ActionTypes from 'ActionsTypes'

export default async function ({nextDispatchAsync}: EffectParams) {
  let action1 = await nextDispatchAsync(ActionTypes.STEP_ONE);
  console.log(`step one complete: ${action1.payload}`);
  let action2 = await nextDispatchAsync(ActionTypes.STEP_TWO);
  console.log(`step two complete: ${action2.payload}`);
  let action3 = await nextDispatchAsync(ActionTypes.STEP_THREE);
  console.log(`step three complete: ${action3.payload}`);
  alert('success!');
}
```

# Naming

The suffix is ex instead of ects because effects is surely taken and I
work on [Exponent](https://getexponent.com/), whose name begins with ex.
Cool story.

# License

MIT
