import dayjs from "dayjs/esm";
import timezone from "dayjs/esm/plugin/timezone";
import utc from "dayjs/esm/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export function getCurrentDatetime() {
	return dayjs().tz("Asia/Tokyo").format("M月D日 HH:mm");
}
