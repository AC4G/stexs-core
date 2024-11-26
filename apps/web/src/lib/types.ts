export interface MFAMethod {
	icon: string;
	description: string;
}

export interface Friend {
	profiles: {
		user_id: string;
		username: string;
	};
}

export interface ExcludeRoute {
	pathname: string;
	callback?: () => void;
}
