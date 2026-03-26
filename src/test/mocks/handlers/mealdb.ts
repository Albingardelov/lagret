import { http, HttpResponse } from 'msw'

const BASE = 'https://www.themealdb.com/api/json/v1/1'

export const MOCK_MEAL = {
  idMeal: '52772',
  strMeal: 'Teriyaki Chicken Casserole',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
  strCategory: 'Chicken',
  strArea: 'Japanese',
  strInstructions: 'Mix all ingredients...',
  strYoutube: '',
  strIngredient1: 'soy sauce',
  strMeasure1: '3/4 cup',
  strIngredient2: 'water',
  strMeasure2: '1/2 cup',
  strIngredient3: 'brown sugar',
  strMeasure3: '1/4 cup',
  strIngredient4: '',
  strMeasure4: '',
  ...Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [
      [`strIngredient${i + 5}`, ''],
      [`strMeasure${i + 5}`, ''],
    ]).flat()
  ),
}

export const mealdbHandlers = [
  http.get(`${BASE}/filter.php`, ({ request }) => {
    const url = new URL(request.url)
    const ingredient = url.searchParams.get('i') ?? ''
    if (ingredient === 'unknown-ingredient-xyz') {
      return HttpResponse.json({ meals: null })
    }
    return HttpResponse.json({
      meals: [
        {
          idMeal: MOCK_MEAL.idMeal,
          strMeal: MOCK_MEAL.strMeal,
          strMealThumb: MOCK_MEAL.strMealThumb,
        },
      ],
    })
  }),

  http.get(`${BASE}/lookup.php`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('i')
    if (id === '00000') {
      return HttpResponse.json({ meals: null })
    }
    return HttpResponse.json({ meals: [MOCK_MEAL] })
  }),

  http.get(`${BASE}/search.php`, ({ request }) => {
    const url = new URL(request.url)
    const name = url.searchParams.get('s') ?? ''
    if (name === 'noresult') {
      return HttpResponse.json({ meals: null })
    }
    return HttpResponse.json({ meals: [MOCK_MEAL] })
  }),
]
