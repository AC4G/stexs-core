import {
	type FormatDistanceStrictOptions,
	formatDistanceStrict as formatDistanceStrictfns,
} from 'date-fns';
import { enUS as locale } from 'date-fns/locale/en-US';

const formatDistanceLocale: any = {
	lessThanXSeconds: '{{count}}s',
	xSeconds: '{{count}}s',
	halfAMinute: '30s',
	lessThanXMinutes: '{{count}}m',
	xMinutes: '{{count}}m',
	aboutXHours: '{{count}}h',
	xHours: '{{count}}h',
	xDays: '{{count}}d',
	aboutXWeeks: '{{count}}w',
	xWeeks: '{{count}}w',
	aboutXMonths: '{{count}}mo',
	xMonths: '{{count}}mo',
	aboutXYears: '{{count}}y',
	xYears: '{{count}}y',
	overXYears: '{{count}}y',
	almostXYears: '{{count}}y',
};

function formatDistance(token: any, count: number, options: any) {
	options = options || {};

	return formatDistanceLocale[token].replace('{{count}}', count);
}

export function formatDistanceStrict<T>(
	date: string | number | Date,
	baseDate: string | number | Date,
	options?: FormatDistanceStrictOptions | undefined,
): string {
	return formatDistanceStrictfns(date, baseDate, {
		locale: {
			...locale,
			formatDistance,
		},
	});
}
