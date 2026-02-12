import {FC, useEffect, useState} from 'react'
import { useMutation, useQueryClient } from "react-query";
import {isNotEmpty} from '../../../../../../../_metronic/helpers'
import {initialUser, User} from '../core/_models'
import {useListView} from '../core/ListViewProvider'
import {UsersListLoading} from '../components/loading/UsersListLoading'
import {createUser, updateUser} from '../core/_requests'
import {useQueryResponse, useQueryResponseData} from '../core/QueryResponseProvider'
import { QUERIES } from '../../../../../../../_metronic/helpers';
import { useAuth } from '../../../../../auth';
import Select from 'react-select'
import Swal from 'sweetalert2';
import axios from 'axios'
import { useTranslation } from 'react-i18next';

const BASE_URL = process.env.VITE_SERVER_URL;
const USER_BASE_URL = `${BASE_URL}/users`;

type Props = {
  isUserLoading: boolean
  user: any
  haveBeenUpadtedData: (data:any) => void
}

interface FormValues {
  email: string;
}

type currentUserType = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string | undefined;
  role: string;
}

const UserEditModalForm: FC<Props> = ({user, isUserLoading, haveBeenUpadtedData}) => {
  const users = useQueryResponseData();
  const { currentUser } = useAuth()
  const {setItemIdForUpdate} = useListView()
  const { refetch, query } = useQueryResponse()
  const userId = currentUser?._id ? String(currentUser._id) : undefined
  const [currentUserData, setcurrentUserData] = useState<currentUserType | null | undefined>()
  const [dataEmpty, setDataEmpty] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false)
  const queryClient = useQueryClient();
  const [emailForCheck, setEmailForCheck] = useState<any>();
  const [errorConfirmPassword, setErrorConfirmPassword] = useState<boolean>(true)
  const [confirmPasswordData, setConfirmPasswordData] = useState<string>("")
  const [currentRoleSelected, setCurrentRoleSelected] = useState<any>();
  const [userRoleForWorker, setUserRoleForWorker] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [values, setValues] = useState<FormValues>({ email: '' });
  const [touched, setTouched] = useState<Partial<FormValues>>({});
  const [openChangePass, setOpenChangePass] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>();
  const [samePassword, setSamePassword] = useState<boolean>(false);
  const [previousPassword, setPreviousPassword] = useState<string>();
  const [textColor, setTextColor] = useState("dark");
  const {t} = useTranslation();
  
  let userForEditUser = user.data;
  const [color, setColor] = useState<string>(userForEditUser?.color || "#aabbcc");
  let SETCURRENT_USER_FOR_EDIT : currentUserType;
  let intervalId : any;
  const [userForEdit] = useState<User>({
    ...user,
    avatar: user.avatar || initialUser.avatar,
    role: user.role || initialUser.role,
    position: user.position || initialUser.position,
    username: user.username || initialUser.username,
    email: user.email || initialUser.email,
  })

  //userRole options-----------------------------------------------
  const userrole: any[] = [
    { value: 'administrator', label: t("ADMINISTRATOR") },
    { value: 'normal_user', label: t("NORMAL_USER") },
  ];

  const inputStyle = {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: 'none',
    overflow : 'hidden',
};

  function changeRole(e : any | null) {
    setcurrentUserData((prev : any) => {
      return {...prev!, "role" : e.value}
    });
    
    setCurrentRoleSelected({ value: e.value, label: e.label })
  }

  const cancel = (event: React.MouseEvent<HTMLInputElement, MouseEvent>,withRefresh?: boolean) => {
    if (withRefresh) {
      refetch()
    }
    setItemIdForUpdate(undefined)
  }

  function inputData(e : any) {
    const { name, value } = e.target;
    setSamePassword(false);
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = {...prev}
      delete next[name]
      return next
    })
    if ( name == 'confirm_password') {
      setConfirmPasswordData(value)
    }else if ( name == 'password') {
      setNewPassword(value)
    }

    // Validate the field
    if (name === 'email') {
      const error = validateEmail(value);
      setErrors({
        ...errors,
        email: error,
      });
    }
    
    setcurrentUserData((prev : any) => {
       return {...prev, [name] : value}
    });
  }

  async function fetchUserData() {
    return await axios.get(`${USER_BASE_URL}`).then((res) => res.data)
  }

  useEffect(() => {
    if (confirmPasswordData) {
      let match_password = checkPasswordMatch(currentUserData?.password, confirmPasswordData)
      setErrorConfirmPassword(match_password)
    }
  }, [currentUserData])

  function checkPasswordMatch(password : string | undefined, confirmPassword : string) {
    if (password === confirmPassword) {
        return true;
    } else {
        return false;
    }
  }

  const isPasswordTooShort = (password?: string) => {
    const len = password?.length ?? 0
    return len > 0 && len < 8
  }

  useEffect(() => {
    SETCURRENT_USER_FOR_EDIT = {
      "id" : userForEditUser ? userForEditUser._id : "",
      "username" : userForEditUser ? userForEditUser.username : "",
      "first_name" : userForEditUser ? userForEditUser.first_name : "",
      "last_name" : userForEditUser ? userForEditUser.last_name : "",
      "email" : userForEditUser ? userForEditUser.email : "",
      "password" : userForEditUser ? userForEditUser.password : "",
      "role" : userForEditUser ? userForEditUser.role : t("NORMAL_USER"),
    }

    if (currentUser?.role) {
      let setFirstChaTolabel = SETCURRENT_USER_FOR_EDIT.role ? SETCURRENT_USER_FOR_EDIT.role[0].toUpperCase() + SETCURRENT_USER_FOR_EDIT.role.slice(1) : setCurrentRoleSelected({ value: 'normal_user', label: t("NORMAL_USER") });
      if (setFirstChaTolabel) {
        setCurrentRoleSelected({ value : SETCURRENT_USER_FOR_EDIT.role?.toLowerCase, label : t(setFirstChaTolabel.toUpperCase())})
      } else {
        setCurrentRoleSelected({ value: 'normal_user', label: t("NORMAL_USER") })
      }
    }

    if (userForEditUser?.password) {
      setPreviousPassword(userForEditUser?.password)
    }

    if (currentUser?.role === "normal_user") {
      setUserRoleForWorker(true);
    }

    if (userForEditUser?.color) {
      setColor(color);
    }
  }, [])

  useEffect(() => {
    // setConfirmPasswordData(SETCURRENT_USER_FOR_EDIT?.password)
    setEmailForCheck(SETCURRENT_USER_FOR_EDIT?.email)
    setcurrentUserData(SETCURRENT_USER_FOR_EDIT)
  }, [dataEmpty])

  useEffect(() => {
    setcurrentUserData((prev : any) => {
      return {...prev, color : color}
   });
  }, [color])

  const onLoading = () => {
    setSubmitting(false);
    setItemIdForUpdate(undefined)
    clearIntervalHandler()
  }

  const updateItem = useMutation((payload: any) => updateUser(payload), {    
    // 💡 response of the mutation is passed to onSuccess
    onSuccess: () => {
      // ✅ update detail view directly
      queryClient.invalidateQueries([`${QUERIES.USERS_LIST}-${query}`]);
    },
  });

  const createItem = useMutation((payload: any) => createUser(payload), {    
    // 💡 response of the mutation is passed to onSuccess
    onSuccess: () => {
      // ✅ update detail view directly
      queryClient.invalidateQueries([`${QUERIES.USERS_LIST}-${query}`]);
    },
  });

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched({
      ...touched,
      [name]: true,
    });
  };

  const validateEmail = (email: string | undefined): string | undefined => {
    if (!email) {
      return t("EMAIL_REQUIRED");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t("INVALID_EMAIL_ADDRESS");
    }
    return undefined;
  };

  const cancelChangePassword = () => {
    setOpenChangePass(false);
    setErrorConfirmPassword(true);
    setNewPassword("");
    setConfirmPasswordData("");
  }


  const onChangePassword = async (e : any) => {
    e.preventDefault();
    
    if (isPasswordTooShort(newPassword)) {
      setFieldErrors({password: t("MIN_8_CHARS")})
      Swal.fire(t("PASSWORD_MIN_LENGTH"));
    } else if (previousPassword && previousPassword === newPassword) {
      setSamePassword(true);
      Swal.fire(t("PASSWORD_MUST_BE_DIFFERENT_CURRENT"));
    } else {
      if (!errorConfirmPassword) {
        Swal.fire({
          icon: "error",
          title: t("OOPS"),
          text: t("SOMETHING_WENT_WRONG"),
        });
      } else {
       await axios.put(`${USER_BASE_URL}/update-user-password/${userForEditUser._id}`, {
         password: newPassword,
         ...(userId ? {updatedBy: userId} : {}),
       }).then((res) => res.data) 
  
       await setOpenChangePass(false);
       setNewPassword("");
       setConfirmPasswordData("");
       Swal.fire({
        position: "center",
        icon: "success",
        title: t("PASSWORD_UPDATED"),
        showConfirmButton: false,
        timer: 1500
      });
      }
    }
  };

  const onEditSubmit = async (e : any) => {
    e.preventDefault()
    let haveTheSame : any[] =  [] 
    let checkEmail : string | undefined = currentUserData?.email
    const emailError = validateEmail(checkEmail);
    const passwordTooShort = isPasswordTooShort(currentUserData?.password)
    const isCreate = !(currentUserData && isNotEmpty(currentUserData.id))
    const nextErrors: Record<string, string> = {}

    if (!currentUserData?.username) nextErrors.username = 'Required'
    if (!currentUserData?.first_name) nextErrors.first_name = 'Required'
    if (!currentUserData?.last_name) nextErrors.last_name = 'Required'
    if (!currentUserData?.email) nextErrors.email = 'Required'
    if (!currentUserData?.role) nextErrors.role = 'Required'
    if (isCreate) {
      if (!currentUserData?.password) nextErrors.password = 'Required'
      if (!confirmPasswordData) nextErrors.confirm_password = 'Required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    if (isCreate && !errorConfirmPassword) {
      setFieldErrors({confirm_password: t("MUST_MATCH_PASSWORD")})
      return
    }
    
      if (currentUserData && isNotEmpty(currentUserData.id)) {
        haveTheSame = []
        const currentId = currentUserData?.id ? String(currentUserData.id) : ''
        const emailDuplicates = users
          .filter(user => user.email != emailForCheck)
          .filter(checkUser => checkUser.email == currentUserData?.email)
        const usernameDuplicates = users
          .filter(user => String(user._id) !== currentId)
          .filter(checkUser => checkUser.username == currentUserData?.username)
        haveTheSame = [...emailDuplicates, ...usernameDuplicates]
        if (emailError) {
          setErrors({ email: emailError });
        } else {
          if (emailDuplicates.length > 0 || usernameDuplicates.length > 0) {
            Swal.fire({
              icon: "question",
              title: t("OOPS"),
              text: t("USERNAME_OR_EMAIL_ALREADY_EXISTS"),
            });
            setFieldErrors({
              ...(emailDuplicates.length > 0 ? {email: 'Duplicate'} : {}),
              ...(usernameDuplicates.length > 0 ? {username: 'Duplicate'} : {}),
            })
          } else {
            const payload = {
              ...(currentUserData || {}),
              ...(userId ? {updatedBy: userId} : {}),
            }
            await updateItem.mutate(payload);
            setSubmitting(true);
            let UserNewData = await fetchUserData()
            haveBeenUpadtedData(UserNewData)
            intervalId = setInterval(onLoading, 1000)
          }
        }
      } else {
        if (!errorConfirmPassword && !openChangePass) {
          Swal.fire({
            icon: "error",
            title: t("OOPS"),
            text: t("SOMETHING_WENT_WRONG"),
          });
        } else {
          const emailDuplicates = users.filter(user => user.email == currentUserData?.email);
          const usernameDuplicates = users.filter(user => user.username == currentUserData?.username);
          haveTheSame = [...emailDuplicates, ...usernameDuplicates]
          if (emailError) {
            setErrors({ email: emailError });
          } else if (passwordTooShort) {
            Swal.fire({
              icon: "error",
              title: t("OOPS"),
              text: t("PASSWORD_MIN_LENGTH"),
            });
            setFieldErrors({password: 'Min 8 characters'})
          } else {
            if (emailDuplicates.length > 0 || usernameDuplicates.length > 0) {
              Swal.fire({
                icon: "question",
                title: t("OOPS"),
                text: t("USERNAME_EMAIL_EXISTS"),
              });
              setFieldErrors({
                ...(emailDuplicates.length > 0 ? {email: 'Duplicate'} : {}),
                ...(usernameDuplicates.length > 0 ? {username: 'Duplicate'} : {}),
              })
            } else {
              const payload = {
                ...(currentUserData || {}),
                ...(userId ? {createdBy: userId, updatedBy: userId} : {}),
              }
              await createItem.mutate(payload);
              setSubmitting(true);
              let UserNewData = await fetchUserData()
              haveBeenUpadtedData(UserNewData)
              intervalId = setInterval(onLoading, 1000)
            }
          }
        }
      }
  }

  // To clear the interval
  const clearIntervalHandler = async () => {
    clearInterval(intervalId);
  };
  useEffect(() => {
    // Function to calculate the brightness of the color
    const calculateBrightness = (hexColor: string) => {
      const hex = hexColor.substring(1);
      const r = parseInt(hex.substring(0, 2), 16); // Extract Red value
      const g = parseInt(hex.substring(2, 4), 16); // Extract Green value
      const b = parseInt(hex.substring(4, 6), 16); // Extract Blue value
      return (r * 299 + g * 587 + b * 114) / 1000; // Formula to calculate brightness
    };
    // Check if color is light or dark
    const isLightColor = calculateBrightness(color) > 128;
    // Set text color based on brightness
    setTextColor(isLightColor ? "dark" : "light");
  }, [color]);

  return (
    <>
      <form id='kt_modal_add_user_form' className='form' onSubmit={onEditSubmit} style={{display : openChangePass ? "none" : "flex"}}>
        <div
          className='d-flex flex-column me-n7 pe-7bg-body'
          id='kt_modal_add_user_scroll'
          data-kt-scroll='true'
          data-kt-scroll-activate='{default: false, lg: true}'
          data-kt-scroll-max-height='auto'
          data-kt-scroll-dependencies='#kt_modal_add_user_header'
          data-kt-scroll-wrappers='#kt_modal_add_user_scroll'
          data-kt-scroll-offset='300px'
        >
          <div className="card-body position-relative" id="Adduser_body">
                <div className="row" style={{display : openChangePass ? "none" : "flex"}}>
                    <div className="col-md-6">
                    <div className="form-group">
                        <div className="mb-5">
                        <span className="fw-bold text-gray-700 required">
                            {t("USERNAME")}
                        </span>
                        <input
                          style={{marginTop: '8px'}}
                          name='username'
                          type="text"
                          defaultValue={userForEditUser ? userForEditUser.username : ""}
                          className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
                          onChange={inputData}
                          required
                        />
                        {fieldErrors.username && <div style={{color : "red"}}>{fieldErrors.username}</div>}
                        </div>
                    </div>
                    <div className="form-group">
                        <div className="mb-5">
                        <span className="fw-bold text-gray-700 required">
                            {t("FIRST_NAME")}
                        </span>
                        <input
                          style={{marginTop: '8px'}}
                          name='first_name'
                          type="text"
                          defaultValue={userForEditUser ? userForEditUser.first_name : ""}
                          className={`form-control ${fieldErrors.first_name ? 'is-invalid' : ''}`}
                          onChange={inputData}
                          required
                        />
                        {fieldErrors.first_name && <div style={{color : "red"}}>{fieldErrors.first_name}</div>}
                        </div>
                    </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group">
                            <div className="mb-5">
                            <span className="fw-bold text-gray-700 required">
                                {t("EMAIL")}
                            </span>
                            <input
                              style={{marginTop: '8px'}}
                              name='email'
                              type="email"
                              defaultValue={userForEditUser ? userForEditUser.email : ""}
                              className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                              onChange={inputData}
                              onBlur={handleBlur}
                              required
                            />
                            {touched.email && errors.email ? (
                                <div style={{color : "red"}}>{errors.email}</div>
                              ) : null}
                            {fieldErrors.email && <div style={{color : "red"}}>{fieldErrors.email}</div>}
                           </div>
                       </div>
                       <div className="form-group">
                        <div className="mb-5">
                        <span className="fw-bold text-gray-700 required">
                            {t("LAST_NAME")}
                        </span>
                        <input
                          style={{marginTop: '8px'}}
                          name='last_name'
                          type="text"
                          defaultValue={userForEditUser ? userForEditUser.last_name : ""}
                          className={`form-control ${fieldErrors.last_name ? 'is-invalid' : ''}`}
                          onChange={inputData}
                          required
                        />
                        {fieldErrors.last_name && <div style={{color : "red"}}>{fieldErrors.last_name}</div>}
                        </div>
                    </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6" style={{display : userForEditUser ? "none" : "block"}}>
                      <div className="form-group">
                          <div className="mb-5">
                          <span className="fw-bold text-gray-700 required">
                              {t("PASSWORD")}
                          </span>
                          <input
                            style={{marginTop: '8px'}}
                            name='password'
                            type="password"
                            defaultValue={userForEditUser ? userForEditUser.password : ""}
                            className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                            onChange={inputData}
                            required
                          />
                          {fieldErrors.password && <span style={{color : "red"}}>{fieldErrors.password}</span>}
                          </div>
                      </div>
                    </div>
                    <div className="col-md-6" style={{display : userForEditUser ? "none" : "block"}}>
                      <div className="form-group">
                          <div className="mb-5">
                          <span className="fw-bold text-gray-700 required">
                              {t("CONFIRM_PASSWORD")}
                          </span>
                          <input
                            style={{marginTop: '8px'}}
                            name="confirm_password"
                            type="password"
                            defaultValue={userForEditUser ? userForEditUser.password : ""}
                            className={`form-control ${fieldErrors.confirm_password ? 'is-invalid' : ''}`}
                            onChange={inputData}
                            required
                          />
                          { !errorConfirmPassword && <span style={{color : "red"}}>{t("MUST_MATCH_PASSWORD")}</span>}
                          {fieldErrors.confirm_password && <span style={{color : "red"}}>{fieldErrors.confirm_password}</span>}
                          </div>
                      </div>
                    </div>
                     <div className="col-md-12">
                      <div className="form-group">
                          <div className="mb-5">
                          <span className="fw-bold text-gray-700 required">
                              {t("ROLE")}
                          </span>
                          <Select
                              className={`react-select-style ${fieldErrors.role ? 'is-invalid' : ''}`} 
                              classNamePrefix='react-select' 
                              options={userrole} 
                              placeholder={t("SELECT_AN_OPTION")} 
                              value={currentRoleSelected} 
                              onChange={changeRole} 
                              isDisabled={userRoleForWorker}
                          />
                          {fieldErrors.role && <div style={{color : "red"}}>{fieldErrors.role}</div>}
                          </div>
                      </div>
                    </div>
                </div>
                <div className='row'>
                  <div className={`col-md-12 ${userForEditUser ? "" : "d-flex flex-end"}`} style={{width : "max-content"}}>
                    <button type="button" 
                      className='btn btn-primary' style={{marginRight: '190px', display : userForEditUser ? "inline-block" : "none"}}
                      onClick={() => setOpenChangePass(!openChangePass)}
                    >
                      {t("CHANGE_PASSWORD")}
                    </button>
                    <button
                      type='submit'
                      className='btn btn-primary'
                      data-kt-users-modal-action='submit'
                      disabled={isUserLoading}
                    >
                      <span className='indicator-label'>{userForEditUser ? t("SAVE") : t("ADD")}</span>
                      {(submitting || isUserLoading) && (
                        <span className='indicator-progress'>
                          {t("PLEASE_WAIT")}{' '}
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </span>
                      )}
                    </button>
                    <input type="button" style={{backgroundColor: '#EFEFEF'}} className="btn ms-3" id="Adduser_close" defaultValue={t("CANCEL")} onClick={(event) => cancel(event)} />
                  </div>
                </div>
            </div>
          </div>
      </form>

      <form onSubmit={onChangePassword} style={{display : openChangePass ? "flex" : "none"}}>
        <div
          className='d-flex flex-column me-n7 pe-7bg-body'>
              <div className="row" style={{display : !openChangePass ? "none" : "flex"}}>
                  <div className="row">
                      <div className="col-md-12">
                          <div className="form-group">
                              <div className="mb-5">
                              <span className="fw-bold text-gray-700 required">
                                  {t("NEW_PASSWORD")}
                              </span>
                              <input style={{marginTop: '8px', border : samePassword ? "1px solid red" : ""}} name='password' type="password" className="form-control" onChange={inputData} value={newPassword ? newPassword : ""} onBlur={handleBlur} placeholder={t("ENTER_NEW_PASSWORD_DESC")} required/>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="row">
                      <div className="col-md-12">
                          <div className="form-group">
                              <div className="mb-5">
                              <span className="fw-bold text-gray-700 required">
                                  {t("CONFIRM_PASSWORD")}
                              </span>
                              <input style={{marginTop: '8px'}} name='confirm_password' type="password" className="form-control" onChange={inputData} onBlur={handleBlur} value={confirmPasswordData ? confirmPasswordData : ""} placeholder={t("ENTER_CONFIRM_PASSWORD_DESC")} required/>
                              { !errorConfirmPassword && <span style={{color : "red"}}>{t("MUST_MATCH_PASSWORD")}</span>}
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
                <div className='d-flex flex-row flex-end pe-5'>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    data-kt-users-modal-action='submit'
                    disabled={isUserLoading}
                  >
                    <span className='indicator-label'>{userForEditUser ? t("UPDATE") : t("ADD")}</span>
                    {(submitting || isUserLoading) && (
                      <span className='indicator-progress'>
                        {t("PLEASE_WAIT")}{' '}
                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                      </span>
                    )}
                  </button>
                  <input type="button" style={{backgroundColor: '#EFEFEF'}} className="btn ms-3" id="Change_password_close" defaultValue={t("CANCEL")} onClick={cancelChangePassword} />
                </div>
        </div>
      </form>
      
      {(submitting || isUserLoading) && <UsersListLoading />}
    </>
  )
}

export {UserEditModalForm}
