# AppApi

All URIs are relative to *http://localhost:3000/v1*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**appControllerGetHello**](AppApi.md#appcontrollergethello) | **GET** / |  |



## appControllerGetHello

> appControllerGetHello()



### Example

```ts
import {
  Configuration,
  AppApi,
} from '@redditmastermind/api';
import type { AppControllerGetHelloRequest } from '@redditmastermind/api';

async function example() {
  console.log("🚀 Testing @redditmastermind/api SDK...");
  const api = new AppApi();

  try {
    const data = await api.appControllerGetHello();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

