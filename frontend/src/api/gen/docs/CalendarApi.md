# CalendarApi

All URIs are relative to *http://localhost:3000*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**calendarControllerGenerateCalendarV1**](CalendarApi.md#calendarcontrollergeneratecalendarv1) | **POST** /v1/calendar/generate | Generate a new content calendar |
| [**calendarControllerGenerateDemoCalendarV1**](CalendarApi.md#calendarcontrollergeneratedemocalendarv1) | **POST** /v1/calendar/generate-demo | Generate a demo calendar using SlideForge sample data |
| [**calendarControllerGenerateNextWeekDemoV1**](CalendarApi.md#calendarcontrollergeneratenextweekdemov1) | **POST** /v1/calendar/generate-next-demo | Generate next week demo calendar |
| [**calendarControllerGenerateNextWeekV1**](CalendarApi.md#calendarcontrollergeneratenextweekv1) | **POST** /v1/calendar/generate-next | Generate calendar for the next week |



## calendarControllerGenerateCalendarV1

> GenerateCalendarResponseDto calendarControllerGenerateCalendarV1(generateCalendarDto)

Generate a new content calendar

Creates a complete content calendar with posts and comments based on the provided campaign configuration.

### Example

```ts
import {
  Configuration,
  CalendarApi,
} from '@redditmastermind/api';
import type { CalendarControllerGenerateCalendarV1Request } from '@redditmastermind/api';

async function example() {
  console.log("🚀 Testing @redditmastermind/api SDK...");
  const api = new CalendarApi();

  const body = {
    // GenerateCalendarDto
    generateCalendarDto: ...,
  } satisfies CalendarControllerGenerateCalendarV1Request;

  try {
    const data = await api.calendarControllerGenerateCalendarV1(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **generateCalendarDto** | [GenerateCalendarDto](GenerateCalendarDto.md) |  | |

### Return type

[**GenerateCalendarResponseDto**](GenerateCalendarResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Calendar generated successfully |  -  |
| **400** | Invalid campaign configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## calendarControllerGenerateDemoCalendarV1

> GenerateCalendarResponseDto calendarControllerGenerateDemoCalendarV1(generateDemoCalendarDto)

Generate a demo calendar using SlideForge sample data

Quick way to test the system using pre-configured SlideForge campaign data.

### Example

```ts
import {
  Configuration,
  CalendarApi,
} from '@redditmastermind/api';
import type { CalendarControllerGenerateDemoCalendarV1Request } from '@redditmastermind/api';

async function example() {
  console.log("🚀 Testing @redditmastermind/api SDK...");
  const api = new CalendarApi();

  const body = {
    // GenerateDemoCalendarDto (optional)
    generateDemoCalendarDto: ...,
  } satisfies CalendarControllerGenerateDemoCalendarV1Request;

  try {
    const data = await api.calendarControllerGenerateDemoCalendarV1(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **generateDemoCalendarDto** | [GenerateDemoCalendarDto](GenerateDemoCalendarDto.md) |  | [Optional] |

### Return type

[**GenerateCalendarResponseDto**](GenerateCalendarResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Demo calendar generated successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## calendarControllerGenerateNextWeekDemoV1

> GenerateCalendarResponseDto calendarControllerGenerateNextWeekDemoV1()

Generate next week demo calendar

Generates the next week calendar using SlideForge sample data, continuing from the last calendar.

### Example

```ts
import {
  Configuration,
  CalendarApi,
} from '@redditmastermind/api';
import type { CalendarControllerGenerateNextWeekDemoV1Request } from '@redditmastermind/api';

async function example() {
  console.log("🚀 Testing @redditmastermind/api SDK...");
  const api = new CalendarApi();

  try {
    const data = await api.calendarControllerGenerateNextWeekDemoV1();
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

[**GenerateCalendarResponseDto**](GenerateCalendarResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Next week demo calendar generated successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## calendarControllerGenerateNextWeekV1

> GenerateCalendarResponseDto calendarControllerGenerateNextWeekV1(generateCalendarDto)

Generate calendar for the next week

Continues from the last generated calendar, automatically calculating the next week start date.

### Example

```ts
import {
  Configuration,
  CalendarApi,
} from '@redditmastermind/api';
import type { CalendarControllerGenerateNextWeekV1Request } from '@redditmastermind/api';

async function example() {
  console.log("🚀 Testing @redditmastermind/api SDK...");
  const api = new CalendarApi();

  const body = {
    // GenerateCalendarDto
    generateCalendarDto: ...,
  } satisfies CalendarControllerGenerateNextWeekV1Request;

  try {
    const data = await api.calendarControllerGenerateNextWeekV1(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **generateCalendarDto** | [GenerateCalendarDto](GenerateCalendarDto.md) |  | |

### Return type

[**GenerateCalendarResponseDto**](GenerateCalendarResponseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Next week calendar generated successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

